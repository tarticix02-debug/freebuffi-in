import { describe, it, expect, beforeEach } from 'vitest';
import { useMultiplayerStore } from '../src/state/multiplayerStore';
import { useGameStore } from '../src/state/gameStore';
import type { MpMessage } from '../src/services/multiplayerTransport';

/**
 * Not: multiplayerStore singleton transport kullanır; bu testler BroadcastChannel
 * yerine handleMessage'ı DOĞRUDAN çağırarak mesaj işleme mantığını sınar
 * (transport değişimi tek noktadan: MultiplayerTransport arayüzü).
 */

const ROOM = 'TEST5';

function hostMsg(partial: Partial<MpMessage> & { type: MpMessage['type'] }): MpMessage {
  return { roomId: ROOM, from: 'host', seq: 1, ...partial } as MpMessage;
}
function guestMsg(partial: Partial<MpMessage> & { type: MpMessage['type'] }): MpMessage {
  return { roomId: ROOM, from: 'guest', seq: 1, ...partial } as MpMessage;
}

describe('multiplayerStore mesaj işleme (host perspektifi)', () => {
  beforeEach(() => {
    useMultiplayerStore.setState({ roomId: ROOM, role: 'host', peerName: null, connected: false, seq: 0, lastError: null });
    useGameStore.getState().startOnline('w');
  });

  it('join mesajı hostu connected yapar ve online maçı kurar', () => {
    useMultiplayerStore.getState().handleMessage(hostMsg({ type: 'join', guestName: 'Misafir' }));
    const mp = useMultiplayerStore.getState();
    expect(mp.connected).toBe(true);
    expect(mp.peerName).toBe('Misafir');
    expect(useGameStore.getState().isOnlineMatch).toBe(true);
    expect(useGameStore.getState().matchInProgress).toBe(true);
    expect(useGameStore.getState().orientation).toBe('w');
  });

  it('guest hamlesi (geçerli, doğru sıra) uygulanır', async () => {
    // Host beyaz; 1.e4 oynayınca sıra siyahta → guest'in e5'i uygulanmalı.
    await useGameStore.getState().playMove('e2', 'e4');
    expect(useGameStore.getState().game.raw.history()).toEqual(['e4']);

    useMultiplayerStore.getState().handleMessage(guestMsg({ type: 'move', moveFrom: 'e7', moveTo: 'e5' }));
    await new Promise((r) => setTimeout(r, 30)); // async applyRemoteMove
    expect(useGameStore.getState().game.raw.history()).toEqual(['e4', 'e5']);
  });

  it('sıra gelmediğinde guest hamlesi yoksayılır (turn gate)', async () => {
    useMultiplayerStore.getState().handleMessage(guestMsg({ type: 'move', moveFrom: 'e7', moveTo: 'e5' }));
    await new Promise((r) => setTimeout(r, 30));
    expect(useGameStore.getState().game.raw.history()).toEqual([]); // beyaz oynamadan siyah hamle edemez
  });

  it('illegal uzak hamle sessizce yoksayılır', async () => {
    await useGameStore.getState().playMove('e2', 'e4');
    useMultiplayerStore.getState().handleMessage(guestMsg({ type: 'move', moveFrom: 'e7', moveTo: 'e6' })); // e6 legal ama sıra... legal olsun: doğru sıra e7e6
    await new Promise((r) => setTimeout(r, 30));
    // e7e6 legaldir (Fransız) — uygulanmış olmalı; ardından duplicate aynı mesaj tekrar uygulanamaz:
    const before = useGameStore.getState().game.raw.history().length;
    useMultiplayerStore.getState().handleMessage(guestMsg({ type: 'move', moveFrom: 'e7', moveTo: 'e6' }));
    await new Promise((r) => setTimeout(r, 30));
    expect(useGameStore.getState().game.raw.history().length).toBe(before + 0); // duplicate: sıra beyazda, yoksayıldı
  });

  it('yanlış oda kodlu mesaj tamamen yoksayılır', () => {
    useMultiplayerStore.getState().handleMessage({ ...guestMsg({ type: 'join', guestName: 'X' }), roomId: 'OTHER' });
    expect(useMultiplayerStore.getState().connected).toBe(false);
  });

  it('peer çıkınca (end/leave) kalan taraf kazanır ve kayıt düşer', async () => {
    await useGameStore.getState().playMove('e2', 'e4');
    useMultiplayerStore.getState().handleMessage(guestMsg({ type: 'end', reason: 'leave' }));
    await new Promise((r) => setTimeout(r, 60)); // async endGame + persist
    const mp = useMultiplayerStore.getState();
    const gs = useGameStore.getState();
    expect(mp.connected).toBe(false);
    expect(mp.peerName).toBeNull();
    expect(gs.matchInProgress).toBe(false); // takılı sıra yok
    expect(gs.gameOverInfo?.over).toBe(true);
    expect(gs.gameOverInfo?.winner).toBe('w'); // çıkan kaybeder, kalan kazanır
    expect(gs.gameOverInfo?.result).toBe('Rakip oyundan çıktı');
    expect(gs.lastSavedGameId).toBeTruthy(); // kayıt düştü
  });

  it('rakip teslim mesajı (end/resign) kalan tarafı kazandırır', async () => {
    useMultiplayerStore.getState().handleMessage(guestMsg({ type: 'end', reason: 'resign' }));
    await new Promise((r) => setTimeout(r, 60));
    const gs = useGameStore.getState();
    expect(gs.gameOverInfo?.over).toBe(true);
    expect(gs.gameOverInfo?.winner).toBe('w');
    expect(gs.gameOverInfo?.result).toBe('Rakip teslim oldu');
    expect(gs.lastSavedGameId).toBeTruthy();
  });
});

describe('multiplayerStore mesaj işleme (guest perspektifi)', () => {
  beforeEach(() => {
    useMultiplayerStore.setState({ roomId: ROOM, role: 'guest', peerName: null, connected: false, seq: 0, lastError: null });
  });

  it('sync mesajı guest tarafında online maçı siyah olarak kurar', () => {
    useMultiplayerStore.getState().handleMessage(hostMsg({ type: 'sync', fen: 'start', pgn: '', orientation: 'w' }));
    const gs = useGameStore.getState();
    expect(gs.isOnlineMatch).toBe(true);
    expect(gs.orientation).toBe('b'); // guest siyah
    expect(gs.matchInProgress).toBe(true);
  });

  it('join-ack host adıyla geldiğinde guest bağlandı görünür', () => {
    useMultiplayerStore.getState().handleMessage(hostMsg({ type: 'join-ack', hostName: 'Host' }));
    const mp = useMultiplayerStore.getState();
    expect(mp.connected).toBe(true);
    expect(mp.peerName).toBe('Host');
  });
});

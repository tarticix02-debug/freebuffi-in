import { create } from 'zustand';
import {
  BroadcastTransport, generateRoomCode, isValidRoomCode,
  type MpMessage, type MpRole, type MultiplayerTransport,
} from '../services/multiplayerTransport';
import { useGameStore } from './gameStore';

export interface MultiplayerState {
  /** null = çok oyunculu kapalı. */
  roomId: string | null;
  role: MpRole | null;
  peerName: string | null;
  myName: string;
  connected: boolean; // peer görüldü mü (join-ack / join geldi mi)
  lastError: string | null;
  seq: number;

  createRoom: (myName: string, timeControlId?: string) => void;
  joinRoom: (code: string, myName: string, timeControlId?: string) => void;
  /** Peer'a hamle bildir (host veya guest, hangi taraf oynadıysa). */
  sendMove: (from: string, to: string, promotion?: string) => void;
  sendSync: (fen: string, pgn: string, orientation: 'w' | 'b') => void;
  leave: (reason?: 'leave' | 'resign') => void;
  /** Transport'tan gelen mesajı işle (store içi kullanım). */
  handleMessage: (msg: MpMessage) => void;
}

/**
 * Online maçın hamle zinciri:
 *  lokal hamle → gameStore.playMove (sıra kilidi + legalite) → moveListener
 *  → sendMove → transport → karşı taraf handleMessage → applyRemoteMove
 *  → playMove (yine sıra kilidi; uzak hamle tekrar yayın yapmaz).
 */
export const useMultiplayerStore = create<MultiplayerState>((set, get) => {
  const transport: MultiplayerTransport = new BroadcastTransport();
  let unsubscribe: (() => void) | null = null;
  /** applyRemoteMove sırasında true: uzak hamlenin echo'su tekrar yayınlanmaz. */
  let applyingRemote = false;

  // Kanca: gameStore'daki HER lokal hamle (kendi sırasında) peer'a gider.
  useGameStore.getState().setMoveListener((from, to, promotion) => {
    get().sendMove(from, to, promotion);
  });

  // ts: MpMessage birleşik tipinin parçaları gönderim sırasına göre eksik
  // alanlarla gelir (from/seq/roomId burada eklenir); bu yüzden iki kez cast.
  function post(msg: Partial<MpMessage> & { type: MpMessage['type'] }) {
    const { roomId, role, seq } = get();
    if (!roomId || !role) return;
    transport.send({ ...msg, roomId, from: role, seq: seq + 1 } as unknown as MpMessage);
    set({ seq: seq + 1 });
  }

  /** Odayı yerel tarafta temizle (karşı tarafa mesaj göndermeden). */
  function resetLocal() {
    unsubscribe?.(); unsubscribe = null;
    transport.close();
    set({ roomId: null, role: null, peerName: null, connected: false, seq: 0 });
    useGameStore.getState().setMoveListener(null);
  }

  return {
    roomId: null,
    role: null,
    peerName: null,
    myName: 'Oyuncu',
    connected: false,
    lastError: null,
    seq: 0,

    createRoom: (myName, timeControlId = 'unlimited') => {
      const code = generateRoomCode();
      unsubscribe?.(); unsubscribe = null;
      transport.open(code, 'host');
      unsubscribe = transport.onMessage((m) => get().handleMessage(m));
      set({ roomId: code, role: 'host', myName, peerName: null, connected: false, lastError: null, seq: 0 });
      // Host beyaz; oyun BAŞLAMAZ — guest katılınca startOnline ile başlar.
      useGameStore.setState({ isOnlineMatch: false });
      void timeControlId;
    },

    joinRoom: (code, myName, timeControlId = 'unlimited') => {
      const normalized = code.trim().toUpperCase();
      if (!isValidRoomCode(normalized)) {
        set({ lastError: 'Oda kodu geçersiz — 5 karakter olmalı (ör. 4NH5G).' });
        return;
      }
      unsubscribe?.(); unsubscribe = null;
      transport.open(normalized, 'guest');
      unsubscribe = transport.onMessage((m) => get().handleMessage(m));
      set({ roomId: normalized, role: 'guest', myName, peerName: null, connected: false, lastError: null, seq: 0 });
      post({ type: 'join', guestName: myName });
      void timeControlId;
    },

    sendMove: (from, to, promotion) => post({ type: 'move', moveFrom: from, moveTo: to, promotion }),
    sendSync: (fen, pgn, orientation) => post({ type: 'sync', fen, pgn, orientation }),

    leave: (reason = 'leave') => {
      // Maç sürüyorsa çıkan taraf kendi oyununu kaybeder (teslim ile aynı).
      const gs = useGameStore.getState();
      if (gs.matchInProgress && gs.isOnlineMatch) void gs.resignGame();
      post({ type: 'end', reason });
      resetLocal();
    },

    handleMessage: (msg) => {
      const { role, roomId } = get();
      if (!role || msg.roomId !== roomId) return;
      const game = useGameStore.getState();
      switch (msg.type) {
        case 'join': {
          // Host tarafı: guest katıldı → online maçı BAŞLAT (host beyaz).
          if (role !== 'host') break;
          set({ peerName: msg.guestName, connected: true });
          if (!game.matchInProgress) useGameStore.getState().startOnline('w');
          // Handshake'i tamamla: guest ancak bundan sonra "bağlandı" görür.
          post({ type: 'join-ack', hostName: get().myName });
          // Başlangıç pozisyonunu guest'e doğrula.
          const g = useGameStore.getState().game;
          get().sendSync(g.fen(), g.snapshot().pgn, 'w');
          break;
        }
        case 'join-ack': // guest tarafı: host onayladı
          if (role === 'guest') set({ peerName: msg.hostName, connected: true });
          break;
        case 'move': {
          // Guest/host karşı hamleyi uygula. Echo/yarış koruması: applyingRemote
          // bayrağıyla uzak hamle tekrar yayınlanmaz; illegal/sıra dışı ise
          // playMove zaten no-op döner (chess.js legalite + turn lock).
          if (applyingRemote) break;
          applyingRemote = true;
          void useGameStore.getState().applyRemoteMove(msg.moveFrom, msg.moveTo, msg.promotion).finally(() => {
            applyingRemote = false;
          });
          break;
        }
        case 'sync':
          // Beta: standard başlangıç senkronu — guest kendi tarafında oyunu kurar.
          if (role === 'guest' && !game.matchInProgress) {
            useGameStore.getState().startOnline('b');
          }
          break;
        case 'end': {
          // Çıkan/teslim olan kaybeder; kalan taraf endGame sahibi üzerinden
          // kazanır (overlay + kayıt, unrated-online kararıyla tutarlı).
          set({ peerName: null, connected: false });
          const gs = useGameStore.getState();
          if (gs.matchInProgress && gs.isOnlineMatch) {
            void gs.endOnlineGameAsWinner(msg.reason === 'resign' ? 'Rakip teslim oldu' : 'Rakip oyundan çıktı');
          }
          resetLocal();
          break;
        }
      }
    },
  };
});

// E2e/doğrulama köprüsü: canonical store erişimi.
if (typeof window !== 'undefined') {
  (window as any).__multiplayerStore = useMultiplayerStore;
}

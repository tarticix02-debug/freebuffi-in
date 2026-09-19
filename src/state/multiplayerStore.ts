import { create } from 'zustand';
import {
  BroadcastTransport, generateRoomCode, isValidRoomCode,
  type MpMessage, type MpRole, type MultiplayerTransport,
} from '../services/multiplayerTransport';

export interface MultiplayerState {
  /** null = çok oyunculu kapalı. */
  roomId: string | null;
  role: MpRole | null;
  peerName: string | null;
  myName: string;
  connected: boolean; // peer görüldü mü (join-ack / join geldi mi)
  lastError: string | null;
  seq: number;

  createRoom: (myName: string) => void;
  joinRoom: (code: string, myName: string) => void;
  /** Peer'a hamle bildir (host veya guest, hangi taraf oynadıysa). */
  sendMove: (from: string, to: string, promotion?: string) => void;
  sendSync: (fen: string, pgn: string, orientation: 'w' | 'b') => void;
  leave: () => void;
  /** Transport'tan gelen mesajı işle (store içi kullanım). */
  handleMessage: (msg: MpMessage) => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => {
  const transport: MultiplayerTransport = new BroadcastTransport();
  let unsubscribe: (() => void) | null = null;

  function post(msg: Omit<MpMessage, 'seq'> & { seq?: number }) {
    const { roomId, role, seq } = get();
    if (!roomId || !role) return;
    transport.send({ ...msg, roomId, from: role, seq: get().seq + 1 } as MpMessage);
    set({ seq: seq + 1 });
  }

  return {
    roomId: null,
    role: null,
    peerName: null,
    myName: 'Oyuncu',
    connected: false,
    lastError: null,
    seq: 0,

    createRoom: (myName) => {
      const code = generateRoomCode();
      unsubscribe?.(); unsubscribe = null;
      transport.open(code, 'host');
      unsubscribe = transport.onMessage((m) => get().handleMessage(m));
      set({ roomId: code, role: 'host', myName, peerName: null, connected: false, lastError: null, seq: 0 });
    },

    joinRoom: (code, myName) => {
      const normalized = code.trim().toUpperCase();
      if (!isValidRoomCode(normalized)) {
        set({ lastError: 'Oda kodu geçersiz — 5 karakter olmalı (ör. 4NH5G).' });
        return;
      }
      unsubscribe?.(); unsubscribe = null;
      transport.open(normalized, 'guest');
      unsubscribe = transport.onMessage((m) => get().handleMessage(m));
      set({ roomId: normalized, role: 'guest', myName, peerName: null, connected: false, lastError: null, seq: 0 });
      post({ type: 'join', guestName: myName } as MpMessage);
    },

    sendMove: (from, to, promotion) => post({ type: 'move', moveFrom: from, moveTo: to, promotion } as MpMessage),
    sendSync: (fen, pgn, orientation) => post({ type: 'sync', fen, pgn, orientation } as MpMessage),

    leave: () => {
      const { roomId } = get();
      if (roomId) post({ type: 'end', reason: 'leave' } as MpMessage);
      unsubscribe?.(); unsubscribe = null;
      transport.close();
      set({ roomId: null, role: null, peerName: null, connected: false, seq: 0 });
    },

    handleMessage: (msg) => {
      const { role, roomId } = get();
      if (!role || msg.roomId !== roomId) return;
      switch (msg.type) {
        case 'join': // host tarafı: guest katıldı
          if (role === 'host') set({ peerName: msg.guestName, connected: true });
          break;
        case 'join-ack': // guest tarafı: host onayladı
          if (role === 'guest') set({ peerName: msg.hostName, connected: true });
          break;
        case 'move':
          // Hamle uygulaması PlayScreen'de yapılır (tahta store'u ile bağlı).
          window.dispatchEvent(new CustomEvent('mp-move', { detail: msg }));
          break;
        case 'sync':
          window.dispatchEvent(new CustomEvent('mp-sync', { detail: msg }));
          break;
        case 'end':
          if (msg.reason === 'leave') set({ peerName: null, connected: false });
          break;
      }
    },
  };
});

// E2e/doğrulama köprüsü: canonical store erişimi.
if (typeof window !== 'undefined') {
  (window as any).__multiplayerStore = useMultiplayerStore;
}

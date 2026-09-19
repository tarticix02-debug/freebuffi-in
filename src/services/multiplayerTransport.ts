/**
 * Çok oyunculu taşıma katmanı — SUNUCUSUZ.
 *
 * Mevcut sürüm: aynı cihaz/tarayıcıda sekmeler arası gerçek zamanlı taşıma
 * (BroadcastChannel). API, gelecekte bir WebSocket/WebRTC transport'una
 * geçirilebilir şekilde tasarlandı: MultiplayerTransport arayüzünü sağlayan
 * herhangi bir katman (ör. sunucu rölesi) aynı multiplayerStore'u besleyebilir.
 *
 * Oda kodu: 5 karakter, karışan harf/rakam seti (0/O, 1/I hariç — telefonda
 * okunur), ör. "4NH5G".
 */

export type MpRole = 'host' | 'guest';

export interface MpMessageBase {
  roomId: string;
  from: MpRole;
  /** Mesajın kendi türü içinde eşsiz olması için sıra numarası. */
  seq: number;
}

export interface MpJoinMsg extends MpMessageBase { type: 'join'; guestName: string }
export interface MpJoinAckMsg extends MpMessageBase { type: 'join-ack'; hostName: string }
export interface MpSyncMsg extends MpMessageBase {
  type: 'sync';
  /** Host'un tahtasının tam FEN'i — guest katıldığında / her hamlede. */
  fen: string;
  pgn: string;
  orientation: 'w' | 'b';
}
export interface MpMoveMsg extends MpMessageBase { type: 'move'; moveFrom: string; moveTo: string; promotion?: string }
export interface MpEndMsg extends MpMessageBase { type: 'end'; reason: 'resign' | 'leave' }
export interface MpChatMsg extends MpMessageBase { type: 'chat'; text: string }

export type MpMessage = MpJoinMsg | MpJoinAckMsg | MpSyncMsg | MpMoveMsg | MpEndMsg | MpChatMsg;

export interface MultiplayerTransport {
  /** Odaya dinlenmeye başla (oda kurulumundan sonra). */
  open(roomId: string, role: MpRole): void;
  send(msg: MpMessage): void;
  close(): void;
  /** Gelen mesajlar için abonelik; dönen fonksiyon aboneliği kaldırır. */
  onMessage(handler: (msg: MpMessage) => void): () => void;
}

const ROOM_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 0/O, 1/I yok — okunabilirlik

/** 5 karakterli oda kodu üretir, ör. "4NH5G". */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return code;
}

/** Oda kodu biçimi geçerli mi (5 karakter, alfabetdeki karakterler)? */
export function isValidRoomCode(code: string): boolean {
  return /^[A-HJ-NP-Z2-9]{5}$/.test(code.trim().toUpperCase());
}

/**
 * BroadcastChannel tabanlı transport. Yayın hedefi: `mp-<roomId>`.
 * Aynı sekmeden kendi mesajlarını duymaz (BroadcastChannel garantisi).
 */
export class BroadcastTransport implements MultiplayerTransport {
  private channel: BroadcastChannel | null = null;
  private handlers = new Set<(msg: MpMessage) => void>();

  open(roomId: string): void {
    this.close();
    this.channel = new BroadcastChannel(`mp-${roomId}`);
    this.channel.onmessage = (e: MessageEvent) => {
      const msg = e.data as MpMessage;
      for (const h of this.handlers) h(msg);
    };
  }

  send(msg: MpMessage): void {
    this.channel?.postMessage(msg);
  }

  onMessage(handler: (msg: MpMessage) => void): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  close(): void {
    this.channel?.close();
    this.channel = null;
  }
}

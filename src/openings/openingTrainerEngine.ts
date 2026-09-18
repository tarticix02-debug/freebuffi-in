import { Chess, type Square } from 'chess.js';  
import type { OpeningLine } from './types';  
  
export type TrainerStatus = 'in_progress' | 'wrong_waiting_retry' | 'completed';  
  
export interface TrainerSession {  
  line: OpeningLine;  
  chess: Chess;  
  moveIndex: number;  
  traineeColor: 'w' | 'b';  
  status: TrainerStatus;  
  mistakes: number[]; // hata yapılan ply indeksleri (bu oturum için)  
  lastMistakeExpectedSan: string | null;  
}  
  
export function createTrainerSession(line: OpeningLine, traineeColor: 'w' | 'b'): TrainerSession {  
  const chess = new Chess();  
  const session: TrainerSession = {  
    line, chess, moveIndex: 0, traineeColor, status: 'in_progress',  
    mistakes: [], lastMistakeExpectedSan: null,  
  };  
  autoPlayOpponentMoves(session);  
  return session;  
}  
  
function autoPlayOpponentMoves(session: TrainerSession) {  
  while (session.moveIndex < session.line.moves.length) {  
    if (session.chess.turn() === session.traineeColor) break;  
    const san = session.line.moves[session.moveIndex];  
    const result = session.chess.move(san);  
    if (!result) { session.status = 'completed'; return; } // veri hatası güvenlik ağı  
    session.moveIndex++;  
  }  
  if (session.moveIndex >= session.line.moves.length) session.status = 'completed';  
}  
  
export function attemptTraineeMove(session: TrainerSession, from: Square, to: Square, promotion?: string): TrainerSession {  
  if (session.status !== 'in_progress') return session;  
  const expectedSan = session.line.moves[session.moveIndex];  
  
  const testChess = new Chess(session.chess.fen());  
  const result = testChess.move({ from, to, promotion });  
  if (!result) return session; // yasal olmayan hamle, sessizce yok say  
  
  if (result.san !== expectedSan) {  
    session.mistakes.push(session.moveIndex);  
    session.lastMistakeExpectedSan = expectedSan;  
    session.status = 'wrong_waiting_retry';  
    return { ...session };  
  }  
  
  session.chess.move({ from, to, promotion });  
  session.moveIndex++;  
  session.lastMistakeExpectedSan = null;  
  autoPlayOpponentMoves(session);  
  return { ...session };  
}  
  
export function retryAfterMistake(session: TrainerSession): TrainerSession {  
  if (session.status !== 'wrong_waiting_retry') return session;  
  return { ...session, status: 'in_progress' };  
}

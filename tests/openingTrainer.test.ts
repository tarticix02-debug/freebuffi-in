import { describe, it, expect } from 'vitest';  
import { createTrainerSession, attemptTraineeMove, retryAfterMistake } from '../src/openings/openingTrainerEngine';  
import type { OpeningLine } from '../src/openings/types';  
  
const ITALIAN: OpeningLine = { eco: 'C50', name: 'İtalyan Açılışı', moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'] };  
  
describe('Açılış antrenman motoru', () => {  
  it('beyaz seçildiğinde ilk hamle trainee\'ye aittir', () => {  
    const session = createTrainerSession(ITALIAN, 'w');  
    expect(session.chess.turn()).toBe('w');  
    expect(session.moveIndex).toBe(0);  
  });  
  
  it('siyah seçildiğinde motor beyazın ilk hamlesini otomatik oynar', () => {  
    const session = createTrainerSession(ITALIAN, 'b');  
    expect(session.chess.turn()).toBe('b');  
    expect(session.moveIndex).toBe(1); // e4 otomatik oynandı  
  });  
  
  it('doğru hamle ilerletir ve rakip hamlesini otomatik oynar', () => {  
    let session = createTrainerSession(ITALIAN, 'w');  
    session = attemptTraineeMove(session, 'e2' as any, 'e4' as any);  
    expect(session.moveIndex).toBe(2); // e4 + otomatik e5  
    expect(session.status).toBe('in_progress');  
  });  
  
  it('yanlış hamle wrong_waiting_retry durumuna geçirir ve pozisyonu bozmaz', () => {  
    let session = createTrainerSession(ITALIAN, 'w');  
    const fenBefore = session.chess.fen();  
    session = attemptTraineeMove(session, 'd2' as any, 'd4' as any); // beklenen e4 değil  
    expect(session.status).toBe('wrong_waiting_retry');  
    expect(session.lastMistakeExpectedSan).toBe('e4');  
    expect(session.chess.fen()).toBe(fenBefore);  
    expect(session.mistakes).toEqual([0]);  
  });  
  
  it('retry sonrası tekrar doğru hamle denenebilir', () => {  
    let session = createTrainerSession(ITALIAN, 'w');  
    session = attemptTraineeMove(session, 'd2' as any, 'd4' as any);  
    session = retryAfterMistake(session);  
    expect(session.status).toBe('in_progress');  
    session = attemptTraineeMove(session, 'e2' as any, 'e4' as any);  
    expect(session.status).toBe('in_progress');  
    expect(session.moveIndex).toBe(2);  
  });  
  
  it('tüm satır tamamlanınca completed olur', () => {  
    let session = createTrainerSession(ITALIAN, 'w');  
    session = attemptTraineeMove(session, 'e2' as any, 'e4' as any); // + e5 auto  
    session = attemptTraineeMove(session, 'g1' as any, 'f3' as any); // + Nc6 auto  
    session = attemptTraineeMove(session, 'f1' as any, 'c4' as any);  
    expect(session.status).toBe('completed');  
  });  
});

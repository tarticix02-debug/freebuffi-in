import { describe, it, expect, vi } from 'vitest';
import { StockfishEngine } from '../src/engine/StockfishEngine';

class MockWorker {
onmessage: ((e: MessageEvent) => void) | null = null;
onerror: ((e: any) => void) | null = null;
listeners: ((e: MessageEvent) => void)[] = [];
postMessage(cmd: string) {
setTimeout(() => {
if (cmd === 'uci') this.emit('uciok');
if (cmd === 'isready') this.emit('readyok');
if (cmd.startsWith('go')) this.emit('bestmove e2e4 ponder e7e5');
}, 0);
}
addEventListener(_type: string, fn: (e: MessageEvent) => void) { this.listeners.push(fn); }
removeEventListener(_type: string, fn: (e: MessageEvent) => void) { this.listeners = this.listeners.filter((l) => l !== fn); }
emit(data: string) { this.listeners.forEach((l) => l({ data } as MessageEvent)); }
terminate() {}
}

// @ts-expect-error test ortamında Worker'ı mockluyoruz
global.Worker = MockWorker;

describe('StockfishEngine UCI state machine', () => {
it('init sonunda READY durumuna geçer', async () => {
const engine = new StockfishEngine();
await engine.init();
expect(engine.getStatus()).toBe('READY');
});

it('eski requestId ile gelen bestmove reddedilir', async () => {
const engine = new StockfishEngine();
await engine.init();
const p1 = engine.analyze('startpos', {}, 'req-1');
engine.stop();
const p2 = engine.analyze('startpos', {}, 'req-2');
await expect(p1).rejects.toThrow();
await expect(p2).resolves.toBeDefined();
});
});

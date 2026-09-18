import { useState } from 'react';
import { useGameStore } from '../../../state/gameStore';
import { UnoCardView } from './UnoCardView';
import type { UnoColor } from '../../../variants/uno/unoDeck';

export function UnoHand({ color }: { color: 'w' | 'b' }) {
  const { variantState, performVariantAction, game } = useGameStore();
  const [pendingWildId, setPendingWildId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  if (!variantState) return null;

  const data = variantState.customData as any;
  const hand = data.hands[color] as { id: string; color: string; value: string }[];
  const isMyTurn = game.raw.turn() === color;
  const cardsBlocked = !isMyTurn || data.hasPlayedCardThisTurn[color];

  function playCard(cardId: string, isWild: boolean) {
    if (isWild) { setPendingWildId(cardId); return; }
    const result = performVariantAction('PLAY_CARD', { cardId });
    setFeedback(result.success ? null : result.reason ?? 'Hamle geçersiz.');
  }
  function chooseWildColor(chosenColor: UnoColor) {
    if (!pendingWildId) return;
    const result = performVariantAction('PLAY_CARD', { cardId: pendingWildId, chosenColor });
    setFeedback(result.success ? null : result.reason ?? 'Hamle geçersiz.');
    setPendingWildId(null);
  }
  function draw() {
    const result = performVariantAction('DRAW_CARD', {});
    setFeedback(result.success ? null : result.reason ?? 'Çekilemedi.');
  }

  return (
    <div className="uno-hand">
      <div className="uno-hand__top">
        Aktif: <span className={`uno-color-dot uno-color-dot--${data.topColor}`} /> {data.topValue}
      </div>
      <div className="uno-hand__cards">
        {hand.map((c: any) => (
          <UnoCardView key={c.id} card={c} disabled={cardsBlocked} onClick={() => playCard(c.id, c.color === 'wild')} />
        ))}
      </div>
      <button disabled={cardsBlocked} onClick={draw}>Kart Çek</button>
      {feedback && <p className="uno-feedback">{feedback}</p>}
      {pendingWildId && (
        <div className="uno-color-picker">
          {(['red', 'yellow', 'green', 'blue'] as UnoColor[]).map((c) => (
            <button key={c} className={`uno-color-swatch uno-color-swatch--${c}`} onClick={() => chooseWildColor(c)} aria-label={c} />
          ))}
        </div>
      )}
    </div>
  );
}

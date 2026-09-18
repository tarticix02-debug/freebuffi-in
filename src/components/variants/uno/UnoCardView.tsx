import type { UnoCard } from '../../../variants/uno/unoDeck';

const COLOR_HEX: Record<string, string> = { red: '#e53e3e', yellow: '#ecc94b', green: '#38a169', blue: '#3182ce', wild: '#1a202c' };
const VALUE_LABEL: Record<string, string> = { skip: '⦸', reverse: '⇄', draw2: '+2', wild: '★', wild4: '+4' };

export function UnoCardView({ card, onClick, disabled }: { card: UnoCard; onClick?: () => void; disabled?: boolean }) {
  return (
    <button className="uno-card" style={{ background: COLOR_HEX[card.color] }} onClick={onClick} disabled={disabled} aria-label={`${card.color} ${card.value}`}>
      {VALUE_LABEL[card.value] ?? card.value}
    </button>
  );
}

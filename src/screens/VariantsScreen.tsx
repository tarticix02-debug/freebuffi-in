import { useNavigate } from 'react-router-dom';
import { VARIANT_REGISTRY } from '../variants/registry';
import { Card } from '../components/common/Card';

export function VariantsScreen() {
  const navigate = useNavigate();
  const variants = Object.values(VARIANT_REGISTRY);

  return (
    <div className="variants-screen">
      <h1>Varyantlar</h1>
      <p>Her varyant, satranç kurallarını gerçekten değiştiren kendi kural motoruna sahiptir.</p>

      <div className="variants-grid">
        {variants.map((v) => (
          <Card
            key={v.id}
            disabled={v.status !== 'implemented'}
            onClick={v.status === 'implemented' ? () => navigate(`/play/variant/${v.id}`) : undefined}
            ariaLabel={v.name}
          >
            <div className="variant-card__header">
              <strong>{v.name}</strong>
              {v.status !== 'implemented' && <span className="theme-badge">Yakında</span>}
            </div>
            <p>{v.description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

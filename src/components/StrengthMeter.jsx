import { ShieldCheck } from 'lucide-react';

export default function StrengthMeter({ title = 'Password Strength', strength, entropy, resistance }) {
  const progressValue = Math.max(1, Math.min(5, (strength?.score ?? 0) + 1));
  const safeEntropy = Number.isFinite(entropy) && entropy > 0 ? entropy : 0;

  return (
    <section className="strength-card" aria-live="polite">
      <div className="section-heading compact">
        <div className="icon-box"><ShieldCheck size={18} /></div>
        <div><span className="eyebrow">Security estimate</span><h3>{title}</h3></div>
      </div>
      <div className="strength-top">
        <strong>{strength?.label || 'Very Weak'}</strong>
        <span>{Math.round(safeEntropy)} bits estimated</span>
      </div>
      <div
        className="strength-track"
        role="progressbar"
        aria-label={`${title}: ${strength?.label || 'Very Weak'}`}
        aria-valuemin="1"
        aria-valuemax="5"
        aria-valuenow={progressValue}
        aria-valuetext={strength?.label || 'Very Weak'}
      >
        <span style={{ width: `${(progressValue / 5) * 100}%` }} />
      </div>
      <p>{strength?.feedback || 'Generate a credential to see its security estimate.'}</p>
      <div className="metric-row"><span>Estimated resistance</span><strong>{resistance || 'Low'}</strong></div>
      <small className="disclaimer">Strength, entropy, and resistance are estimates, not guarantees of real-world security.</small>
    </section>
  );
}

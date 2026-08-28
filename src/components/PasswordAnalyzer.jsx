import { useMemo, useState } from 'react';
import { ScanSearch, ShieldAlert } from 'lucide-react';
import { detectPoolSize, analyzeStrength } from '../utils/strengthCalculator.js';
import { estimatePasswordEntropy, resistanceLabel } from '../utils/entropyCalculator.js';

export default function PasswordAnalyzer() {
  const [value, setValue] = useState('');
  const result = useMemo(() => {
    const poolSize = detectPoolSize(value);
    const entropy = estimatePasswordEntropy(Array.from(value).length, poolSize);
    return { entropy, strength: analyzeStrength(value, entropy), resistance: resistanceLabel(entropy) };
  }, [value]);

  return (
    <section className="panel analyzer-panel" id="analyzer" aria-labelledby="analyzer-title">
      <div className="section-heading">
        <div className="icon-box"><ScanSearch size={19} /></div>
        <div><span className="eyebrow">Local analysis</span><h2 id="analyzer-title">Check Password Strength</h2></div>
      </div>
      <p className="muted">Type or paste a password to inspect it locally. The app does not add analyzer input to history, persistent storage, logs, or network requests.</p>
      <label className="field-label" htmlFor="analyze-password">Password to analyze</label>
      <input
        id="analyze-password"
        className="text-input mono"
        type="password"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        autoComplete="off"
        spellCheck="false"
        placeholder="Enter a password locally"
      />
      <div className="analyzer-grid" aria-live="polite">
        <div><span>Strength</span><strong>{result.strength.label}</strong></div>
        <div><span>Pool-based entropy</span><strong>{Math.round(result.entropy)} bits</strong></div>
        <div><span>Resistance</span><strong>{result.resistance}</strong></div>
      </div>
      <p className="analyzer-feedback">{result.strength.feedback}</p>
      <div className="inline-note"><ShieldAlert size={16} />This analysis happens locally. Entropy for typed passwords is only a rough pool-based estimate and can overstate predictable human-created passwords.</div>
    </section>
  );
}

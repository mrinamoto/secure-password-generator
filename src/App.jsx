import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check, ChevronDown, Clipboard, Copy, Eye, EyeOff, Fingerprint, History,
  KeyRound, LockKeyhole, Moon, RefreshCw, RotateCcw, Shield, ShieldCheck, Sparkles,
  Sun, WandSparkles, Zap,
} from 'lucide-react';
import Toggle from './components/Toggle.jsx';
import StrengthMeter from './components/StrengthMeter.jsx';
import SessionHistory from './components/SessionHistory.jsx';
import PasswordAnalyzer from './components/PasswordAnalyzer.jsx';
import Toast from './components/Toast.jsx';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useSessionStorage } from './hooks/useSessionStorage.js';
import { buildPools, generatePassword, validatePasswordSettings } from './utils/passwordGenerator.js';
import { generatePassphrase, validatePassphraseSettings } from './utils/passphraseGenerator.js';
import { estimatePassphraseEntropy, estimatePasswordEntropy, resistanceLabel } from './utils/entropyCalculator.js';
import { analyzeStrength } from './utils/strengthCalculator.js';
import { WORD_LIST } from './data/wordList.js';

const DEFAULT_SETTINGS = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeSimilar: false,
  customExclusions: '',
  customSymbolsEnabled: false,
  customSymbols: '!@#$%',
};

const DEFAULT_PASSPHRASE = {
  wordCount: 5,
  separator: '-',
  capitalizeWords: false,
  addNumber: true,
};

const PERSISTED_SETTINGS_DEFAULTS = {
  length: DEFAULT_SETTINGS.length,
  uppercase: DEFAULT_SETTINGS.uppercase,
  lowercase: DEFAULT_SETTINGS.lowercase,
  numbers: DEFAULT_SETTINGS.numbers,
  symbols: DEFAULT_SETTINGS.symbols,
  excludeSimilar: DEFAULT_SETTINGS.excludeSimilar,
};

const PRESETS = [8, 12, 16, 20, 24, 32];
const EMPTY_STRENGTH = {
  score: 0,
  label: 'Very Weak',
  feedback: 'Generate a credential to see its security estimate.',
};
const EMPTY_METRICS = { entropy: 0, strength: EMPTY_STRENGTH, resistance: 'Low' };

function normalizeSettings(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const parsedLength = Number(source.length);
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    length: Number.isInteger(parsedLength) ? Math.max(4, Math.min(64, parsedLength)) : DEFAULT_SETTINGS.length,
    uppercase: typeof source.uppercase === 'boolean' ? source.uppercase : DEFAULT_SETTINGS.uppercase,
    lowercase: typeof source.lowercase === 'boolean' ? source.lowercase : DEFAULT_SETTINGS.lowercase,
    numbers: typeof source.numbers === 'boolean' ? source.numbers : DEFAULT_SETTINGS.numbers,
    symbols: typeof source.symbols === 'boolean' ? source.symbols : DEFAULT_SETTINGS.symbols,
    excludeSimilar: typeof source.excludeSimilar === 'boolean' ? source.excludeSimilar : DEFAULT_SETTINGS.excludeSimilar,
    customExclusions: typeof source.customExclusions === 'string' ? source.customExclusions : '',
    customSymbolsEnabled: typeof source.customSymbolsEnabled === 'boolean' ? source.customSymbolsEnabled : DEFAULT_SETTINGS.customSymbolsEnabled,
    customSymbols: typeof source.customSymbols === 'string' ? source.customSymbols : DEFAULT_SETTINGS.customSymbols,
  };
}

function normalizePassphraseSettings(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const wordCount = Number(source.wordCount);
  return {
    wordCount: Number.isInteger(wordCount) ? Math.max(3, Math.min(8, wordCount)) : DEFAULT_PASSPHRASE.wordCount,
    separator: typeof source.separator === 'string' ? Array.from(source.separator).slice(0, 3).join('') : DEFAULT_PASSPHRASE.separator,
    capitalizeWords: typeof source.capitalizeWords === 'boolean' ? source.capitalizeWords : DEFAULT_PASSPHRASE.capitalizeWords,
    addNumber: typeof source.addNumber === 'boolean' ? source.addNumber : DEFAULT_PASSPHRASE.addNumber,
  };
}

function persistedSettings(value) {
  const settings = normalizeSettings(value);
  return {
    length: settings.length,
    uppercase: settings.uppercase,
    lowercase: settings.lowercase,
    numbers: settings.numbers,
    symbols: settings.symbols,
    excludeSimilar: settings.excludeSimilar,
  };
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === 'object' && typeof item.value === 'string' && item.id)
    .map((item) => ({
      ...item,
      length: Number.isInteger(item.length) ? item.length : Array.from(item.value).length,
      strength: typeof item.strength === 'string' ? item.strength : 'Estimated',
      time: typeof item.time === 'string' ? item.time : 'Earlier',
    }))
    .slice(0, 12);
}

function uniqueId() {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  if (!cryptoApi?.getRandomValues) throw new Error('Secure randomness is unavailable in this browser.');

  const values = new Uint32Array(4);
  cryptoApi.getRandomValues(values);
  return [...values].map((value) => value.toString(16).padStart(8, '0')).join('-');
}

function formatTime() {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date());
}

function passwordMetrics(value, settings) {
  const { pools } = buildPools(settings);
  const poolSize = new Set(Array.from(pools.map((pool) => pool.value).join(''))).size;
  const entropy = estimatePasswordEntropy(Array.from(value).length, poolSize);
  return { entropy, strength: analyzeStrength(value, entropy), resistance: resistanceLabel(entropy) };
}

function passphraseMetrics(value, settings) {
  const entropy = estimatePassphraseEntropy(settings.wordCount, WORD_LIST.length, settings);
  return { entropy, strength: analyzeStrength(value, entropy), resistance: resistanceLabel(entropy) };
}

export default function App() {
  const [theme, setTheme] = useLocalStorage('passwordGenerator.theme', 'dark');
  const [storedPreferences, setStoredPreferences] = useLocalStorage('passwordGenerator.settings', PERSISTED_SETTINGS_DEFAULTS);
  const [storedHistory, setStoredHistory] = useSessionStorage('passwordGenerator.sessionHistory', []);
  const history = normalizeHistory(storedHistory);

  const [mode, setMode] = useState('password');
  const [settings, setSettingsState] = useState(() => normalizeSettings({
    ...storedPreferences,
    customExclusions: '',
    customSymbolsEnabled: false,
    customSymbols: DEFAULT_SETTINGS.customSymbols,
  }));
  const [passphraseSettings, setPassphraseSettings] = useState(DEFAULT_PASSPHRASE);
  const safeTheme = theme === 'light' ? 'light' : 'dark';
  const [password, setPassword] = useState('');
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [visible, setVisible] = useState(true);
  const [multipleCount, setMultipleCount] = useState(1);
  const [batch, setBatch] = useState([]);
  const [toast, setToast] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const toastTimer = useRef(null);
  const didInitialGenerate = useRef(false);

  const validation = mode === 'password'
    ? validatePasswordSettings(settings)
    : validatePassphraseSettings(passphraseSettings);

  const setSettings = useCallback((next) => {
    setSettingsState((previous) => normalizeSettings(
      typeof next === 'function' ? next(previous) : next,
    ));
  }, []);

  useEffect(() => {
    setStoredPreferences(persistedSettings(settings));
  }, [settings.length, settings.uppercase, settings.lowercase, settings.numbers, settings.symbols, settings.excludeSimilar, setStoredPreferences]);

  const setHistory = useCallback((next) => {
    setStoredHistory((previous) => {
      const safePrevious = normalizeHistory(previous);
      return normalizeHistory(typeof next === 'function' ? next(safePrevious) : next);
    });
  }, [setStoredHistory]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = safeTheme;
    document.documentElement.style.colorScheme = safeTheme;
  }, [safeTheme]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const copyText = useCallback(async (value, message = 'Copied to clipboard.') => {
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.readOnly = true;
        textarea.setAttribute('aria-hidden', 'true');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand('copy');
        textarea.remove();
        if (!copied) throw new Error('Copy command was rejected.');
      }
      showToast(message);
    } catch {
      showToast('Copy failed. Select the credential and copy it manually.', 'info');
    }
  }, [showToast]);

  const addHistory = useCallback((value, entrySettings, entryStrength) => {
    const item = {
      id: uniqueId(),
      value,
      length: Array.from(value).length,
      strength: entryStrength,
      time: formatTime(),
      settings: entrySettings,
    };
    setHistory((previous) => [item, ...previous].slice(0, 12));
  }, [setHistory]);

  const generateOne = useCallback((notify = true) => {
    try {
      let next;
      let entrySettings;
      let nextMetrics;

      if (mode === 'password') {
        const error = validatePasswordSettings(settings);
        if (error) throw new Error(error);
        next = generatePassword(settings);
        nextMetrics = passwordMetrics(next, settings);
        entrySettings = { mode: 'password', settings: { ...settings } };
      } else {
        const error = validatePassphraseSettings(passphraseSettings);
        if (error) throw new Error(error);
        next = generatePassphrase(passphraseSettings);
        nextMetrics = passphraseMetrics(next, passphraseSettings);
        entrySettings = { mode: 'passphrase', settings: { ...passphraseSettings } };
      }

      setPassword(next);
      setMetrics(nextMetrics);
      setBatch([]);
      setVisible(true);
      addHistory(next, entrySettings, nextMetrics.strength.label);
      if (notify) showToast(mode === 'password' ? 'Password generated.' : 'Passphrase generated.');
      return next;
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to generate a credential.', 'info');
      return '';
    }
  }, [mode, settings, passphraseSettings, addHistory, showToast]);

  useEffect(() => {
    if (didInitialGenerate.current) return;
    didInitialGenerate.current = true;
    generateOne(false);
  }, []); // Intentional one-time first-load generation.

  const generateMultiple = () => {
    if (multipleCount === 1) {
      generateOne();
      return;
    }

    const outputs = [];
    let firstMetrics = EMPTY_METRICS;

    for (let index = 0; index < multipleCount; index += 1) {
      try {
        let value;
        let entrySettings;
        let entryMetrics;

        if (mode === 'password') {
          const error = validatePasswordSettings(settings);
          if (error) throw new Error(error);
          value = generatePassword(settings);
          entryMetrics = passwordMetrics(value, settings);
          entrySettings = { mode: 'password', settings: { ...settings } };
        } else {
          const error = validatePassphraseSettings(passphraseSettings);
          if (error) throw new Error(error);
          value = generatePassphrase(passphraseSettings);
          entryMetrics = passphraseMetrics(value, passphraseSettings);
          entrySettings = { mode: 'passphrase', settings: { ...passphraseSettings } };
        }

        if (index === 0) firstMetrics = entryMetrics;
        outputs.push(value);
        addHistory(value, entrySettings, entryMetrics.strength.label);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Unable to generate credentials.', 'info');
        return;
      }
    }

    setBatch(outputs);
    setPassword(outputs[0] || '');
    setMetrics(firstMetrics);
    setVisible(true);
    showToast(`${outputs.length} random ${mode === 'password' ? 'passwords' : 'passphrases'} generated.`);
  };

  const clearCurrentOutput = () => {
    setPassword('');
    setMetrics(EMPTY_METRICS);
    setBatch([]);
    setVisible(true);
  };

  const switchMode = (nextMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    clearCurrentOutput();
  };

  const reuseSettings = (saved) => {
    if (!saved || typeof saved !== 'object') return;
    if (saved.mode === 'passphrase') {
      setMode('passphrase');
      setPassphraseSettings(normalizePassphraseSettings(saved.settings));
    } else {
      setMode('password');
      setSettings({ ...DEFAULT_SETTINGS, ...(saved.settings || {}) });
    }
    clearCurrentOutput();
    showToast('Settings restored from history. Generate to apply them.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setSettings(DEFAULT_SETTINGS);
    setPassphraseSettings(DEFAULT_PASSPHRASE);
    setMultipleCount(1);
    setMode('password');
    setAdvancedOpen(false);
    clearCurrentOutput();
    showToast('Settings reset to defaults.');
  };

  useEffect(() => {
    const handler = (event) => {
      const tag = event.target?.tagName?.toLowerCase();
      const editable = event.target?.isContentEditable;
      if (['input', 'textarea', 'select'].includes(tag) || editable || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key.toLowerCase() === 'g') generateOne();
      if (event.key.toLowerCase() === 'c') copyText(password, 'Credential copied.');
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [generateOne, copyText, password]);

  const updateSetting = (key, value) => setSettings((previous) => ({ ...previous, [key]: value }));
  const updatePhrase = (key, value) => setPassphraseSettings((previous) => normalizePassphraseSettings({ ...previous, [key]: value }));
  const outputName = mode === 'password' ? 'password' : 'passphrase';

  return (
    <div className="app-shell">
      <Toast toast={toast} />

      <header className="site-header">
        <a className="brand" href="#top" aria-label="Secure Password Generator home">
          <span className="brand-mark"><LockKeyhole size={21} /></span>
          <span>Secure<span>Password</span></span>
        </a>
        <div className="header-actions">
          <a className="header-link" href="#history"><History size={17} />History</a>
          <button
            className="theme-button"
            onClick={() => setTheme(safeTheme === 'dark' ? 'light' : 'dark')}
            aria-label={`Switch to ${safeTheme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {safeTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="page-title">
          <div className="trust-pill"><ShieldCheck size={15} />Private by design · Web Crypto powered</div>
          <h1 id="page-title">Generate credentials you can <span>actually trust.</span></h1>
          <p>Create strong, customizable passwords and passphrases directly in your browser. Generated credentials are not sent to a server.</p>
          <div className="privacy-strip" aria-label="Privacy highlights">
            <span><Fingerprint size={16} />Local generation</span>
            <span><Shield size={16} />No account</span>
            <span><Zap size={16} />Instant output</span>
          </div>
        </section>

        <section className="workspace" aria-label="Password generation workspace">
          <div className="generator-column">
            <article className="panel generator-panel">
              <div className="mode-switch" role="group" aria-label="Generation mode">
                <button aria-pressed={mode === 'password'} className={mode === 'password' ? 'active' : ''} onClick={() => switchMode('password')}>
                  <KeyRound size={17} />Password
                </button>
                <button aria-pressed={mode === 'passphrase'} className={mode === 'passphrase' ? 'active' : ''} onClick={() => switchMode('passphrase')}>
                  <WandSparkles size={17} />Passphrase
                </button>
              </div>

              <div className="output-label">
                <span>Generated {outputName}</span>
                <span className="secure-badge"><ShieldCheck size={14} />Secure random</span>
              </div>

              <div className="password-output">
                <code aria-live="polite" aria-label={`Generated ${outputName}`}>
                  {password ? (visible ? password : '•'.repeat(Math.min(Array.from(password).length, 40))) : 'Generate to begin'}
                </code>
                <div className="output-actions">
                  <button aria-label={visible ? `Hide ${outputName}` : `Show ${outputName}`} onClick={() => setVisible((value) => !value)} disabled={!password}>
                    {visible ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                  <button aria-label={`Copy ${outputName}`} onClick={() => copyText(password, `${outputName === 'password' ? 'Password' : 'Passphrase'} copied.`)} disabled={!password}>
                    <Copy size={19} />
                  </button>
                  <button aria-label={`Regenerate ${outputName}`} onClick={() => generateOne()} disabled={Boolean(validation)}>
                    <RefreshCw size={19} />
                  </button>
                </div>
              </div>

              <p className="clipboard-note">Copied credentials may remain in your operating-system clipboard until replaced.</p>

              {mode === 'password' ? (
                <>
                  <div className="control-block">
                    <div className="control-title">
                      <label htmlFor="password-length">Password length</label>
                      <input
                        id="password-length-number"
                        aria-label="Password length number"
                        type="number"
                        min="4"
                        max="64"
                        value={settings.length}
                        onChange={(event) => updateSetting('length', Math.max(4, Math.min(64, Number(event.target.value) || 4)))}
                      />
                    </div>
                    <input
                      id="password-length"
                      className="range"
                      type="range"
                      min="4"
                      max="64"
                      value={settings.length}
                      onChange={(event) => updateSetting('length', Number(event.target.value))}
                    />
                    <div className="preset-row" aria-label="Common password lengths">
                      {PRESETS.map((preset) => (
                        <button
                          className={settings.length === preset ? 'selected' : ''}
                          key={preset}
                          onClick={() => updateSetting('length', preset)}
                          aria-pressed={settings.length === preset}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="options-grid">
                    <Toggle checked={settings.uppercase} onChange={(value) => updateSetting('uppercase', value)} label="Uppercase" description="A–Z" />
                    <Toggle checked={settings.lowercase} onChange={(value) => updateSetting('lowercase', value)} label="Lowercase" description="a–z" />
                    <Toggle checked={settings.numbers} onChange={(value) => updateSetting('numbers', value)} label="Numbers" description="0–9" />
                    <Toggle checked={settings.symbols} onChange={(value) => updateSetting('symbols', value)} label="Symbols" description="! @ # $ …" />
                  </div>

                  <button
                    className="advanced-toggle"
                    onClick={() => setAdvancedOpen((value) => !value)}
                    aria-expanded={advancedOpen}
                    aria-controls="advanced-options"
                  >
                    Advanced options <ChevronDown size={18} className={advancedOpen ? 'rotate' : ''} />
                  </button>

                  {advancedOpen && (
                    <div className="advanced-content" id="advanced-options">
                      <Toggle checked={settings.excludeSimilar} onChange={(value) => updateSetting('excludeSimilar', value)} label="Exclude similar characters" description="Removes 0 O o 1 l I and | for easier manual reading." />
                      <label className="field-label" htmlFor="custom-exclusions">Exclude custom characters</label>
                      <input
                        id="custom-exclusions"
                        className="text-input mono"
                        type="text"
                        value={settings.customExclusions}
                        onChange={(event) => updateSetting('customExclusions', event.target.value)}
                        placeholder={'Example: "\'`\\'}
                        autoComplete="off"
                        spellCheck="false"
                      />
                      <Toggle checked={settings.customSymbolsEnabled} onChange={(value) => updateSetting('customSymbolsEnabled', value)} label="Use custom symbol set" description="Printable ASCII symbols only; useful for websites with symbol restrictions." />
                      {settings.customSymbolsEnabled && (
                        <>
                          <label className="field-label" htmlFor="custom-symbols">Allowed symbols</label>
                          <input
                            id="custom-symbols"
                            className="text-input mono"
                            type="text"
                            value={settings.customSymbols}
                            onChange={(event) => updateSetting('customSymbols', event.target.value)}
                            placeholder="!@#$%"
                            autoComplete="off"
                            spellCheck="false"
                          />
                        </>
                      )}
                    </div>
                  )}

                  {validation && <div className="validation-message" role="alert">{validation}</div>}
                </>
              ) : (
                <div className="passphrase-controls">
                  <div className="split-controls">
                    <label>
                      Word count
                      <input
                        type="number"
                        min="3"
                        max="8"
                        value={passphraseSettings.wordCount}
                        onChange={(event) => updatePhrase('wordCount', Math.max(3, Math.min(8, Number(event.target.value) || 3)))}
                      />
                    </label>
                    <label>
                      Separator
                      <input
                        className="mono"
                        type="text"
                        maxLength="3"
                        value={passphraseSettings.separator}
                        onChange={(event) => updatePhrase('separator', event.target.value)}
                        placeholder="-"
                        autoComplete="off"
                      />
                    </label>
                  </div>
                  <Toggle checked={passphraseSettings.capitalizeWords} onChange={(value) => updatePhrase('capitalizeWords', value)} label="Capitalize words" description="Formatting option; it does not add entropy because it is deterministic." />
                  <Toggle checked={passphraseSettings.addNumber} onChange={(value) => updatePhrase('addNumber', value)} label="Add a random number" description="Appends a securely generated 00–99 value." />
                  <div className="inline-note"><Sparkles size={16} />Uses a bundled local word list. No external word service is called.</div>
                  {validation && <div className="validation-message" role="alert">{validation}</div>}
                </div>
              )}

              <div className="generate-row">
                <select value={multipleCount} onChange={(event) => setMultipleCount(Number(event.target.value))} aria-label={`Number of ${outputName}s to generate`}>
                  {[1, 3, 5, 10].map((count) => <option value={count} key={count}>{count} {outputName}{count > 1 ? 's' : ''}</option>)}
                </select>
                <button className="primary-button" onClick={generateMultiple} disabled={Boolean(validation)}>
                  <Sparkles size={18} />Generate {multipleCount > 1 ? multipleCount : ''}
                </button>
              </div>

              {batch.length > 1 && (
                <div className="batch-output" aria-label="Generated batch">
                  <div className="batch-header">
                    <strong>Generated batch</strong>
                    <button onClick={() => copyText(batch.join('\n'), 'All generated credentials copied.')}><Clipboard size={16} />Copy all</button>
                  </div>
                  {batch.map((item, index) => (
                    <div className="batch-item" key={`${item}-${index}`}>
                      <code>{item}</code>
                      <button aria-label={`Copy generated item ${index + 1}`} onClick={() => copyText(item, 'Credential copied.')}><Copy size={15} /></button>
                    </div>
                  ))}
                </div>
              )}

              <div className="panel-footer">
                <span>Keyboard: <kbd>G</kbd> generate · <kbd>C</kbd> copy</span>
                <button onClick={reset}><RotateCcw size={15} />Reset to defaults</button>
              </div>
            </article>
          </div>

          <aside className="insight-column" aria-label="Security insights">
            <StrengthMeter
              title={mode === 'password' ? 'Password Strength' : 'Passphrase Strength'}
              strength={metrics.strength}
              entropy={metrics.entropy}
              resistance={metrics.resistance}
            />

            <section className="privacy-card">
              <div className="icon-box large"><LockKeyhole size={22} /></div>
              <span className="eyebrow">Privacy boundary</span>
              <h3>Private by Design</h3>
              <ul>
                <li><Check size={15} />Credentials are generated locally in your browser</li>
                <li><Check size={15} />No generated credential is sent to a server</li>
                <li><Check size={15} />No database or account is required</li>
                <li><Check size={15} />Generated history uses sessionStorage only</li>
              </ul>
            </section>

            <section className="tips-card">
              <span className="eyebrow">Good practice</span>
              <h3>Password Security Tips</h3>
              <ul>
                <li>Use a unique password for every account.</li>
                <li>Prefer long random passwords and a trusted password manager.</li>
                <li>Enable multi-factor authentication where available.</li>
                <li>Avoid predictable personal information and password reuse.</li>
              </ul>
            </section>
          </aside>
        </section>

        <SessionHistory
          history={history}
          onCopy={(value) => copyText(value, 'History credential copied.')}
          onDelete={(id) => {
            setHistory((items) => items.filter((item) => item.id !== id));
            showToast('History item deleted.');
          }}
          onClear={() => {
            setHistory([]);
            showToast('Session history cleared.');
          }}
          onReuse={reuseSettings}
        />

        <PasswordAnalyzer />

        <section className="security-note panel">
          <div><ShieldCheck size={26} /><h2>Security without theatre.</h2></div>
          <p>Actual cracking time depends heavily on attack method, password hashing algorithm, hardware, password reuse, leaks, and whether the credential is truly random. This tool intentionally uses approximate resistance labels instead of fake precise crack-time claims.</p>
        </section>
      </main>

      <footer>
        <div><LockKeyhole size={17} />Secure Password Generator</div>
        <p>Frontend only · No database · Web Crypto generation · Session history uses sessionStorage</p>
        <span className="footer-status"><ShieldCheck size={16} />Portfolio-ready security utility</span>
      </footer>
    </div>
  );
}

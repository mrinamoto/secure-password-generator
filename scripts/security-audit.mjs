import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CHARACTER_POOLS,
  SIMILAR_CHARACTERS,
  generatePassword,
  validatePasswordSettings,
} from '../src/utils/passwordGenerator.js';
import { generatePassphrase } from '../src/utils/passphraseGenerator.js';
import { secureRandomIndex } from '../src/utils/secureRandom.js';
import { estimatePasswordEntropy, estimatePassphraseEntropy } from '../src/utils/entropyCalculator.js';
import { analyzeStrength } from '../src/utils/strengthCalculator.js';
import { WORD_LIST } from '../src/data/wordList.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const BASE = {
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

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function sourceText() {
  return walk(path.join(projectRoot, 'src'))
    .filter((file) => /\.(js|jsx|css)$/.test(file))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
}

function hasUpper(value) { return /[A-Z]/.test(value); }
function hasLower(value) { return /[a-z]/.test(value); }
function hasNumber(value) { return /\d/.test(value); }
function hasSymbol(value) { return /[^A-Za-z0-9]/.test(value); }

const src = sourceText();
assert.equal(/Math\.random\s*\(/.test(src), false, 'Math.random must not appear in application source.');
assert.equal(/console\.(log|debug|info)\s*\(/.test(src), false, 'Debug console logging must not remain.');
assert.equal(/\bfetch\s*\(|XMLHttpRequest|indexedDB|document\.cookie|URLSearchParams/.test(src), false, 'Secrets must not be sent or persisted through disallowed browser APIs.');

const appSource = fs.readFileSync(path.join(projectRoot, 'src/App.jsx'), 'utf8');
assert.match(appSource, /useSessionStorage\('passwordGenerator\.sessionHistory'/, 'History must use sessionStorage.');
assert.doesNotMatch(appSource, /useLocalStorage\('passwordGenerator\.sessionHistory'/, 'History must never use localStorage.');
assert.match(appSource, /useLocalStorage\('passwordGenerator\.theme'/, 'Theme may use localStorage.');
assert.match(appSource, /useLocalStorage\('passwordGenerator\.settings'/, 'Non-sensitive settings may use localStorage.');
const persistedStart = appSource.indexOf('function persistedSettings');
const persistedEnd = appSource.indexOf('function normalizeHistory', persistedStart);
const persistedBlock = appSource.slice(persistedStart, persistedEnd);
assert.doesNotMatch(persistedBlock, /customExclusions|customSymbols/, 'Advanced custom text must not be persisted in localStorage.');

for (const length of [4, 8, 12, 16, 20, 32, 64]) {
  for (let iteration = 0; iteration < 250; iteration += 1) {
    const value = generatePassword({ ...BASE, length });
    assert.equal(Array.from(value).length, length, `Length mismatch at ${length}.`);
    assert.equal(hasUpper(value), true, 'Uppercase guarantee failed.');
    assert.equal(hasLower(value), true, 'Lowercase guarantee failed.');
    assert.equal(hasNumber(value), true, 'Number guarantee failed.');
    assert.equal(hasSymbol(value), true, 'Symbol guarantee failed.');
  }
}

for (const [key, matcher] of [
  ['uppercase', hasUpper],
  ['lowercase', hasLower],
  ['numbers', hasNumber],
  ['symbols', hasSymbol],
]) {
  const settings = { ...BASE, uppercase: false, lowercase: false, numbers: false, symbols: false, [key]: true };
  for (let iteration = 0; iteration < 100; iteration += 1) {
    const value = generatePassword(settings);
    assert.equal(Array.from(value).length, settings.length);
    assert.equal(matcher(value), true, `${key} only generation failed.`);
  }
}

assert.equal(
  validatePasswordSettings({ ...BASE, uppercase: false, lowercase: false, numbers: false, symbols: false }),
  'Select at least one character type.',
);
assert.match(validatePasswordSettings({ ...BASE, length: 3 }), /at least 4/);

const noSimilar = { ...BASE, excludeSimilar: true, length: 64 };
for (let iteration = 0; iteration < 200; iteration += 1) {
  const value = generatePassword(noSimilar);
  for (const char of SIMILAR_CHARACTERS) assert.equal(value.includes(char), false, `Similar char leaked: ${char}`);
}

const excluded = 'ABCxyz789!@#';
const customExcluded = { ...BASE, customExclusions: excluded, length: 64 };
for (let iteration = 0; iteration < 100; iteration += 1) {
  const value = generatePassword(customExcluded);
  for (const char of excluded) assert.equal(value.includes(char), false, `Custom exclusion leaked: ${char}`);
}

const allUpperExcluded = { ...BASE, lowercase: false, numbers: false, symbols: false, customExclusions: CHARACTER_POOLS.uppercase };
assert.match(validatePasswordSettings(allUpperExcluded), /uppercase character pool is empty/);
assert.throws(() => generatePassword(allUpperExcluded), /uppercase character pool is empty/);

assert.match(
  validatePasswordSettings({ ...BASE, customSymbolsEnabled: true, customSymbols: 'A!' }),
  /printable ASCII symbols only/,
);
assert.match(
  validatePasswordSettings({ ...BASE, customSymbolsEnabled: true, customSymbols: '🔒' }),
  /printable ASCII symbols only/,
);

for (let iteration = 0; iteration < 5000; iteration += 1) {
  const index = secureRandomIndex(149);
  assert.ok(index >= 0 && index < 149);
}
assert.throws(() => secureRandomIndex(0), RangeError);
assert.throws(() => secureRandomIndex(0x100000001), RangeError);

for (const wordCount of [3, 4, 6]) {
  const phrase = generatePassphrase({ wordCount, separator: '-', capitalizeWords: false, addNumber: false });
  assert.equal(phrase.split('-').length, wordCount);
}

const emptySeparatorPhrase = generatePassphrase({ wordCount: 3, separator: '', capitalizeWords: false, addNumber: false });
assert.equal(emptySeparatorPhrase.includes('-'), false, 'Empty separator must be respected.');

const capitalized = generatePassphrase({ wordCount: 4, separator: '_', capitalizeWords: true, addNumber: false });
assert.equal(capitalized.split('_').every((word) => /^[A-Z]/.test(word)), true, 'Capitalization option failed.');

const numbered = generatePassphrase({ wordCount: 4, separator: '-', capitalizeWords: false, addNumber: true });
assert.match(numbered, /-\d{2}$/);

assert.equal(new Set(WORD_LIST).size, WORD_LIST.length, 'Bundled passphrase word list must not contain duplicates.');

const noCapEntropy = estimatePassphraseEntropy(4, WORD_LIST.length, { addNumber: false, capitalizeWords: false });
const capEntropy = estimatePassphraseEntropy(4, WORD_LIST.length, { addNumber: false, capitalizeWords: true });
assert.equal(capEntropy, noCapEntropy, 'Deterministic capitalization must not add entropy.');

for (const count of [1, 3, 5, 10]) {
  const generated = Array.from({ length: count }, () => generatePassword(BASE));
  assert.equal(generated.length, count);
  generated.forEach((value) => assert.equal(Array.from(value).length, BASE.length));
}

for (const [length, pool] of [[0, 0], [16, 94], [64, 94], [16, Number.NaN], [16, Number.POSITIVE_INFINITY]]) {
  const bits = estimatePasswordEntropy(length, pool);
  assert.equal(Number.isFinite(bits), true, 'Entropy must always be finite.');
  assert.ok(bits >= 0, 'Entropy must never be negative.');
  const result = analyzeStrength('A1!example', bits);
  assert.ok(result.score >= 0 && result.score <= 4, 'Strength score out of range.');
}

process.stdout.write([
  'PASS: final security and generator audit',
  '- Web Crypto-only random selection/shuffle verified by source scan',
  '- Required character classes verified across repeated generation',
  '- Lengths 4/8/12/16/20/32/64 verified',
  '- Exclusions, empty pools, passphrases, multi-generation verified',
  '- Entropy remains finite and strength score remains within 0-4',
  '- sessionStorage/localStorage boundaries verified by source scan',
].join('\n') + '\n');

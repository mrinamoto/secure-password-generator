import { secureChoice, secureShuffle } from './secureRandom.js';

export const CHARACTER_POOLS = Object.freeze({
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{};:,.?',
});

export const SIMILAR_CHARACTERS = '0Oo1lI|';
const ENABLED_KEYS = ['uppercase', 'lowercase', 'numbers', 'symbols'];
const ASCII_SYMBOL = /^[!-/:-@[-`{-~]$/;

function normalizeSettings(settings = {}) {
  return {
    length: Number(settings.length),
    uppercase: Boolean(settings.uppercase),
    lowercase: Boolean(settings.lowercase),
    numbers: Boolean(settings.numbers),
    symbols: Boolean(settings.symbols),
    excludeSimilar: Boolean(settings.excludeSimilar),
    customExclusions: typeof settings.customExclusions === 'string' ? settings.customExclusions : '',
    customSymbolsEnabled: Boolean(settings.customSymbolsEnabled),
    customSymbols: typeof settings.customSymbols === 'string' ? settings.customSymbols : '',
  };
}

function uniqueCharacters(value) {
  return [...new Set(Array.from(value))].join('');
}

export function buildPools(settings) {
  const normalized = normalizeSettings(settings);
  const excluded = new Set(Array.from(
    `${normalized.excludeSimilar ? SIMILAR_CHARACTERS : ''}${normalized.customExclusions}`,
  ));

  const symbolSource = normalized.customSymbolsEnabled
    ? normalized.customSymbols
    : CHARACTER_POOLS.symbols;

  const rawPools = {
    uppercase: CHARACTER_POOLS.uppercase,
    lowercase: CHARACTER_POOLS.lowercase,
    numbers: CHARACTER_POOLS.numbers,
    symbols: symbolSource,
  };

  const enabledKeys = ENABLED_KEYS.filter((key) => normalized[key]);
  const pools = enabledKeys.map((key) => ({
    key,
    value: uniqueCharacters(Array.from(rawPools[key]).filter((char) => !excluded.has(char)).join('')),
  }));

  return { pools, enabledKeys };
}

export function validatePasswordSettings(settings) {
  const normalized = normalizeSettings(settings);
  const { pools, enabledKeys } = buildPools(normalized);

  if (!enabledKeys.length) return 'Select at least one character type.';
  if (!Number.isInteger(normalized.length)) {
    return 'Password length must be an integer between 4 and 64.';
  }
  if (normalized.length < enabledKeys.length) {
    return `Password length must be at least ${enabledKeys.length} when ${enabledKeys.length} character types are enabled.`;
  }
  if (normalized.length < 4 || normalized.length > 64) {
    return 'Password length must be an integer between 4 and 64.';
  }

  if (normalized.customSymbolsEnabled && normalized.symbols) {
    const customSymbols = Array.from(normalized.customSymbols);
    if (!customSymbols.length) return 'Custom symbol set cannot be empty while Symbols is enabled.';
    if (customSymbols.some((char) => !ASCII_SYMBOL.test(char))) {
      return 'Custom symbol set may contain printable ASCII symbols only (no letters, numbers, spaces, or emoji).';
    }
  }

  const emptyPool = pools.find((pool) => !pool.value.length);
  if (emptyPool) {
    return `The ${emptyPool.key} character pool is empty after exclusions. Change your exclusions or symbol set.`;
  }

  const combinedPool = uniqueCharacters(pools.map((pool) => pool.value).join(''));
  if (!combinedPool.length) return 'All available characters have been excluded.';
  return '';
}

export function generatePassword(settings) {
  const validation = validatePasswordSettings(settings);
  if (validation) throw new Error(validation);

  const normalized = normalizeSettings(settings);
  const { pools } = buildPools(normalized);
  const combinedPool = uniqueCharacters(pools.map((pool) => pool.value).join(''));

  // Guarantee one character from every enabled category.
  const output = pools.map((pool) => secureChoice(pool.value));

  // Fill remaining positions from the full allowed pool.
  while (output.length < normalized.length) {
    output.push(secureChoice(combinedPool));
  }

  // Fisher-Yates shuffle using secure random indexes keeps required characters
  // from appearing in predictable positions.
  return secureShuffle(output).join('');
}

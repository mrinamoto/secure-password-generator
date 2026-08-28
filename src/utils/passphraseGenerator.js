import { secureChoice, secureRandomIndex } from './secureRandom.js';
import { WORD_LIST } from '../data/wordList.js';

export function validatePassphraseSettings(settings = {}) {
  if (!Number.isInteger(settings.wordCount) || settings.wordCount < 3 || settings.wordCount > 8) {
    return 'Passphrase word count must be between 3 and 8.';
  }
  if (!WORD_LIST.length) return 'The local passphrase word list is empty.';
  if (typeof settings.separator !== 'string' || Array.from(settings.separator).length > 3) {
    return 'Passphrase separator must be 0 to 3 characters.';
  }
  return '';
}

export function generatePassphrase(settings) {
  const validation = validatePassphraseSettings(settings);
  if (validation) throw new Error(validation);

  const words = [];
  for (let index = 0; index < settings.wordCount; index += 1) {
    let word = secureChoice(WORD_LIST);
    if (settings.capitalizeWords) word = word.charAt(0).toUpperCase() + word.slice(1);
    words.push(word);
  }

  if (settings.addNumber) words.push(String(secureRandomIndex(100)).padStart(2, '0'));
  return words.join(settings.separator);
}

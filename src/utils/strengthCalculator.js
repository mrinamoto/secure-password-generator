const COMMON_PATTERNS = [
  'password', '123456', 'qwerty', 'admin', 'letmein', 'welcome', 'abc123', 'iloveyou',
];
const SEQUENCES = [
  'abcdefghijklmnopqrstuvwxyz',
  'zyxwvutsrqponmlkjihgfedcba',
  '0123456789',
  '9876543210',
];

function includesSequence(value, size = 4) {
  const lower = value.toLowerCase();
  for (const sequence of SEQUENCES) {
    for (let index = 0; index <= sequence.length - size; index += 1) {
      if (lower.includes(sequence.slice(index, index + size))) return true;
    }
  }
  return false;
}

function hasHeavyRepetition(value) {
  const characters = Array.from(value);
  if (characters.length < 4) return false;

  const counts = new Map();
  for (const char of characters) counts.set(char, (counts.get(char) || 0) + 1);
  return Math.max(...counts.values()) / characters.length >= 0.4;
}

function safeEntropy(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function analyzeStrength(value, estimatedEntropy = 0) {
  if (!value) {
    return {
      score: 0,
      label: 'Very Weak',
      feedback: 'Generate or enter a password to analyze it.',
      flags: { common: false, sequence: false, repeated: false, categories: 0 },
    };
  }

  const entropy = safeEntropy(estimatedEntropy);
  const lower = value.toLowerCase();
  const categories = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/]
    .filter((regex) => regex.test(value)).length;

  let score = entropy >= 80 ? 4 : entropy >= 60 ? 3 : entropy >= 36 ? 2 : entropy >= 28 ? 1 : 0;

  const common = COMMON_PATTERNS.some((pattern) => lower.includes(pattern));
  const sequence = includesSequence(value);
  const repeated = /(.)\1{2,}/.test(value) || hasHeavyRepetition(value);

  if (common) score = Math.min(score, 1);
  if (sequence) score -= 1;
  if (repeated) score -= 1;
  if (categories <= 1 && Array.from(value).length < 20) score = Math.min(score, 2);

  score = Math.max(0, Math.min(4, score));

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  let feedback = 'Long and diverse password.';
  if (common) feedback = 'Contains a common weak password pattern.';
  else if (sequence) feedback = 'Avoid obvious alphabetic or numeric sequences.';
  else if (repeated) feedback = 'Repeated characters reduce practical strength.';
  else if (Array.from(value).length < 12) feedback = 'Consider increasing the password length.';
  else if (categories < 3) feedback = 'Use more character types or a longer password.';
  else if (Array.from(value).length >= 16) feedback = 'A long, randomly generated credential has a strong estimated resistance.';

  return { score, label: labels[score], feedback, flags: { common, sequence, repeated, categories } };
}

export function detectPoolSize(value) {
  if (!value) return 0;
  let size = 0;
  if (/[A-Z]/.test(value)) size += 26;
  if (/[a-z]/.test(value)) size += 26;
  if (/\d/.test(value)) size += 10;
  if (/[^A-Za-z0-9]/.test(value)) size += 32;
  return size;
}

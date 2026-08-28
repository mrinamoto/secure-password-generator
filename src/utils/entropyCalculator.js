function normalizePositiveNumber(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function estimatePasswordEntropy(length, poolSize) {
  const safeLength = normalizePositiveNumber(length);
  const safePoolSize = normalizePositiveNumber(poolSize);
  if (!safeLength || safePoolSize <= 1) return 0;

  const bits = safeLength * Math.log2(safePoolSize);
  return Number.isFinite(bits) && bits > 0 ? bits : 0;
}

export function estimatePassphraseEntropy(wordCount, wordListSize, options = {}) {
  const safeWordCount = normalizePositiveNumber(wordCount);
  const safeWordListSize = normalizePositiveNumber(wordListSize);
  if (!safeWordCount || safeWordListSize <= 1) return 0;

  let bits = safeWordCount * Math.log2(safeWordListSize);

  // The optional number is independently sampled from 00-99, adding log2(100) bits.
  if (options.addNumber) bits += Math.log2(100);

  // Capitalization and separator are deterministic formatting choices in this app,
  // so they do not add entropy.
  return Number.isFinite(bits) && bits > 0 ? bits : 0;
}

export function entropyLabel(bits) {
  const safeBits = Number.isFinite(bits) && bits > 0 ? bits : 0;
  if (safeBits < 28) return 'Very Weak';
  if (safeBits < 36) return 'Weak';
  if (safeBits < 60) return 'Fair';
  if (safeBits < 80) return 'Strong';
  return 'Very Strong';
}

export function resistanceLabel(bits) {
  const safeBits = Number.isFinite(bits) && bits > 0 ? bits : 0;
  if (safeBits < 36) return 'Low';
  if (safeBits < 60) return 'Moderate';
  if (safeBits < 80) return 'High';
  return 'Very High';
}

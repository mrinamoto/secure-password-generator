const UINT32_RANGE = 0x100000000;

function getCrypto() {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.getRandomValues) {
    throw new Error('Secure randomness is unavailable in this browser.');
  }
  return cryptoApi;
}

export function secureRandomIndex(maxExclusive) {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > UINT32_RANGE) {
    throw new RangeError(`maxExclusive must be an integer between 1 and ${UINT32_RANGE}.`);
  }

  // Reject the incomplete tail of the uint32 range before applying modulo.
  // This prevents modulo bias whenever UINT32_RANGE is not divisible by maxExclusive.
  const limit = UINT32_RANGE - (UINT32_RANGE % maxExclusive);
  const values = new Uint32Array(1);
  const cryptoApi = getCrypto();

  do {
    cryptoApi.getRandomValues(values);
  } while (values[0] >= limit);

  return values[0] % maxExclusive;
}

export function secureChoice(source) {
  if (typeof source === 'string') {
    const characters = Array.from(source);
    if (!characters.length) throw new Error('Cannot choose from an empty source.');
    return characters[secureRandomIndex(characters.length)];
  }

  if (!source?.length) throw new Error('Cannot choose from an empty source.');
  return source[secureRandomIndex(source.length)];
}

export function secureShuffle(values) {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomIndex(index + 1);
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

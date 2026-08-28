import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from '../utils/storageUtils.js';

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readStorage('localStorage', key, initialValue));

  useEffect(() => {
    writeStorage('localStorage', key, value);
  }, [key, value]);

  return [value, setValue];
}

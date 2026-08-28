import { useEffect, useState } from 'react';
import { readStorage, writeStorage } from '../utils/storageUtils.js';

export function useSessionStorage(key, initialValue) {
  const [value, setValue] = useState(() => readStorage('sessionStorage', key, initialValue));

  useEffect(() => {
    writeStorage('sessionStorage', key, value);
  }, [key, value]);

  return [value, setValue];
}

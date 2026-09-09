// Cryptographic hashing and PIN strength validation for Personal PIN security

export interface PinValidationResult {
  valid: boolean;
  message: string;
}

// 1. Weak PIN Validation
// Prohibits sequential, repeated, or predictable 6-digit combinations
export function validatePinStrength(pin: string): PinValidationResult {
  const cleanPin = (pin || '').trim();

  // Exactly 6 numeric digits
  if (!/^\d{6}$/.test(cleanPin)) {
    return {
      valid: false,
      message: 'Personal PIN must be exactly 6 numeric digits (0-9).',
    };
  }

  // 1. Repeated identical digits (e.g. 000000, 111111, 222222, etc.)
  if (/^(\d)\1{5}$/.test(cleanPin)) {
    return {
      valid: false,
      message: 'Weak PIN: Cannot use repeated identical digits (e.g. 111111).',
    };
  }

  // 2. Sequential ascending sequences (e.g. 012345, 123456, 234567, 345678, 456789, 567890)
  const ascendingSequences = [
    '012345', '123456', '234567', '345678', '456789', '567890',
  ];
  if (ascendingSequences.includes(cleanPin)) {
    return {
      valid: false,
      message: 'Weak PIN: Cannot use sequential ascending digits (e.g. 123456).',
    };
  }

  // 3. Sequential descending sequences (e.g. 987654, 876543, 765432, 654321, 543210, 432109)
  const descendingSequences = [
    '987654', '876543', '765432', '654321', '543210', '432109',
  ];
  if (descendingSequences.includes(cleanPin)) {
    return {
      valid: false,
      message: 'Weak PIN: Cannot use sequential descending digits (e.g. 654321).',
    };
  }

  // 4. Repeated 2-digit patterns (e.g. 121212, 232323, 696969, 101010)
  if (/^(\d{2})\1{2}$/.test(cleanPin)) {
    return {
      valid: false,
      message: 'Weak PIN: Cannot use repeated 2-digit pairs (e.g. 121212).',
    };
  }

  // 5. Repeated 3-digit patterns (e.g. 123123, 456456, 789789)
  if (/^(\d{3})\1$/.test(cleanPin)) {
    return {
      valid: false,
      message: 'Weak PIN: Cannot use repeated 3-digit pattern (e.g. 123123).',
    };
  }

  // 6. Common predictable numbers
  const commonWeak = [
    '112233', '123321', '654456', '998877', '135791', '246802', '147258', '258369', '369258',
  ];
  if (commonWeak.includes(cleanPin)) {
    return {
      valid: false,
      message: 'Weak PIN: Please choose a more secure, unpredictable 6-digit combination.',
    };
  }

  return {
    valid: true,
    message: 'Strong and valid 6-digit Personal PIN.',
  };
}

// Generate random cryptographic salt (32 hex characters)
export function generateSalt(byteLength: number = 16): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(byteLength);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  // Fallback random hex generator
  let result = '';
  const hex = '0123456789abcdef';
  for (let i = 0; i < byteLength * 2; i++) {
    result += hex.charAt(Math.floor(Math.random() * hex.length));
  }
  return result;
}

// Internal pure-JS SHA-256 implementation fallback
function sha256Sync(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0, j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];

      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] =
        i < 16
          ? w[i]
          : ((w[i - 16] + s0 + w[i - 7] + s1) | 0);

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const s0Hash = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const s1Hash = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);

      const t1 = hash[7] + s1Hash + ch + k[i] + (w[i] || 0);
      const t2 = s0Hash + maj;

      hash = [(t1 + t2) | 0].concat(hash);
      hash[4] = (hash[4] + t1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// Compute one-way cryptographic SHA-256 hash of (salt + ":" + pin)
export async function hashPin(pin: string, salt: string): Promise<string> {
  const combined = `staroil_pin_salt_${salt}:${pin.trim()}`;
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const msgUint8 = new TextEncoder().encode(combined);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('Crypto subtle fallback:', e);
    }
  }
  return sha256Sync(combined);
}

// Synchronous version of hashPin for instantaneous verification & seed data
export function hashPinSync(pin: string, salt: string): string {
  const combined = `staroil_pin_salt_${salt}:${pin.trim()}`;
  return sha256Sync(combined);
}

// Verify a provided PIN against stored hash & salt (constant-time check)
export async function verifyPinHash(
  candidatePin: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> {
  if (!candidatePin || !storedHash || !storedSalt) return false;
  const calculated = await hashPin(candidatePin, storedSalt);
  
  // Constant-time string equality
  if (calculated.length !== storedHash.length) return false;
  let result = 0;
  for (let i = 0; i < calculated.length; i++) {
    result |= calculated.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}

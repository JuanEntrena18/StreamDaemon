import { describe, it, expect } from 'vitest';
import { encryptToken, decryptToken } from './token-crypto.js';

describe('token-crypto', () => {
  it('encrypts and decrypts a token', () => {
    const token = 'super_secret_token_123';
    const encrypted = encryptToken(token);
    expect(encrypted).not.toBe(token);
    expect(encrypted).toContain(':');

    const decrypted = decryptToken(encrypted);
    expect(decrypted).toBe(token);
  });

  it('produces different ciphertexts for the same token', () => {
    const token = 'same_token';
    const a = encryptToken(token);
    const b = encryptToken(token);
    expect(a).not.toBe(b);
    expect(decryptToken(a)).toBe(token);
    expect(decryptToken(b)).toBe(token);
  });
});

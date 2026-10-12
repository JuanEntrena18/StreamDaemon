import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const LEGACY_SALT = 'streamforger-token-salt-v1';

const DATA_DIR = process.env.DATA_DIR || path.resolve('data');
const MASTER_KEY_FILE = path.join(DATA_DIR, 'token-master.key');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadOrGenerateMasterKey(): Buffer {
  try {
    if (fs.existsSync(MASTER_KEY_FILE)) {
      const key = fs.readFileSync(MASTER_KEY_FILE);
      if (key.length === 32) return key;
    }
  } catch { /* generará uno nuevo */ }
  const key = randomBytes(32);
  ensureDataDir();
  try {
    fs.writeFileSync(MASTER_KEY_FILE, key, { mode: 0o600 });
  } catch {
    // Fallback if permissions can't be set (e.g. some Windows configs)
    fs.writeFileSync(MASTER_KEY_FILE, key);
  }
  return key;
}

const MASTER_KEY = loadOrGenerateMasterKey();

export function encryptToken(plain: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, MASTER_KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptToken(encoded: string): string {
  return decryptWithKey(encoded, MASTER_KEY);
}

export function decryptTokenLegacy(encoded: string, legacySecret: string): string {
  const key = scryptSync(legacySecret, LEGACY_SALT, 32);
  return decryptWithKey(encoded, key);
}

function decryptWithKey(encoded: string, key: Buffer): string {
  const parts = encoded.split(':');
  if (parts.length !== 3) throw new Error('Invalid token format');
  const [ivHex, tagHex, encHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const enc = Buffer.from(encHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString('utf8');
}

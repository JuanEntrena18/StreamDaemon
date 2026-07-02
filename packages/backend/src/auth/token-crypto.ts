import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import fs from 'fs';
import path from 'path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const DATA_DIR = path.resolve('data');
const SALT_FILE = path.join(DATA_DIR, 'token-salt.bin');

function loadOrGenerateSalt(): Buffer {
  try {
    if (fs.existsSync(SALT_FILE)) {
      return fs.readFileSync(SALT_FILE);
    }
  } catch { /* generará uno nuevo */ }
  const salt = randomBytes(16);
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(SALT_FILE, salt);
  return salt;
}

const INSTALL_SALT = loadOrGenerateSalt();

function deriveKey(secret: string): Buffer {
  return scryptSync(secret, INSTALL_SALT, 32);
}

export function encryptToken(plain: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

export function decryptToken(encoded: string, secret: string): string {
  const key = deriveKey(secret);
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

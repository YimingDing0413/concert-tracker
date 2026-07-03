import crypto from 'node:crypto';
import { authSecret, envValue } from '../env.js';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function encryptionKey(): Buffer {
  const raw = envValue('SPOTIFY_TOKEN_ENCRYPTION_KEY') || authSecret();
  return crypto.createHash('sha256').update(raw).digest();
}

/** Encrypt a Spotify token for DynamoDB storage. */
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

/** Decrypt a Spotify token loaded from DynamoDB. */
export function decryptToken(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64url');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const data = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

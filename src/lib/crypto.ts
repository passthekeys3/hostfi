/**
 * Encryption utilities for sensitive credentials stored in Supabase.
 * Uses AES-256-GCM with a server-side key from CREDENTIALS_ENCRYPTION_KEY env var.
 * 
 * Format: base64(iv:ciphertext:authTag)
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('CREDENTIALS_ENCRYPTION_KEY not configured');
  }
  // Accept hex (64 chars) or base64 (44 chars) keys
  if (key.length === 64) return Buffer.from(key, 'hex');
  return Buffer.from(key, 'base64').subarray(0, 32);
}

/**
 * Encrypt a JSON-serializable value.
 * Returns a base64-encoded string containing iv:ciphertext:authTag.
 */
export function encryptCredentials(data: Record<string, unknown>): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack as iv:ciphertext:authTag
  const packed = Buffer.concat([iv, encrypted, authTag]);
  return packed.toString('base64');
}

/**
 * Decrypt a previously encrypted credential string.
 * Returns the original JSON object.
 */
export function decryptCredentials(encryptedStr: string): Record<string, string> {
  const key = getKey();
  const packed = Buffer.from(encryptedStr, 'base64');

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(packed.length - AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH, packed.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8'));
}

/**
 * Check if a credentials value is encrypted (base64 blob) vs plaintext JSON.
 * Used for migration: reads both old plaintext and new encrypted formats.
 */
export function isEncrypted(value: unknown): boolean {
  if (typeof value === 'string') {
    // Encrypted values are base64 strings, not JSON objects
    try {
      JSON.parse(value);
      return false; // It's a JSON string, not encrypted
    } catch (error) {
      // Not JSON — likely encrypted base64
      return true;
    }
  }
  return false; // Objects are plaintext
}

/**
 * Safely read credentials — handles both encrypted (string) and legacy plaintext (object) formats.
 * This allows gradual migration without breaking existing connections.
 */
export function readCredentials(credentials: unknown): Record<string, string> {
  if (!credentials) throw new Error('No credentials');
  
  // Legacy: plaintext JSON object stored directly
  if (typeof credentials === 'object') {
    return credentials as Record<string, string>;
  }

  // New: encrypted base64 string
  if (typeof credentials === 'string') {
    return decryptCredentials(credentials);
  }

  throw new Error('Unknown credentials format');
}

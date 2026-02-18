/**
 * Helper to read Plaid access tokens that may be encrypted or plaintext.
 * Supports gradual migration — old plaintext tokens and new encrypted tokens both work.
 */
import { readCredentials } from '@/lib/crypto';

export function decryptPlaidToken(storedToken: string): string {
  // Plaintext tokens start with 'access-' (sandbox/development) or 'access_' 
  if (storedToken.startsWith('access-') || storedToken.startsWith('access_') || storedToken === 'demo-access-token') {
    return storedToken;
  }

  // Try to decrypt — if it fails, assume plaintext
  try {
    const decrypted = readCredentials(storedToken);
    return decrypted.token || storedToken;
  } catch (error) {
    // Decryption failed — assume plaintext token
    console.error('Plaid token decryption failed, assuming plaintext:', error);
    return storedToken;
  }
}

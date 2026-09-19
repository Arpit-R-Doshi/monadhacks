import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Generate a random AES-256 encryption key
 */
export function generateKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Encrypt data using AES-256-GCM
 * @param {string|Buffer} data - Data to encrypt
 * @param {string} keyHex - 64-char hex key
 * @returns {string} - Base64 encoded encrypted data (iv + tag + ciphertext)
 */
export function encrypt(data, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const inputBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
  const encrypted = Buffer.concat([cipher.update(inputBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine iv + tag + ciphertext
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedBase64 - Base64 encoded encrypted data
 * @param {string} keyHex - 64-char hex key
 * @returns {string} - Decrypted string
 */
export function decrypt(encryptedBase64, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  const combined = Buffer.from(encryptedBase64, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf-8');
}

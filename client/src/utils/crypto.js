/**
 * Web Crypto API — AES-256-GCM encryption/decryption helpers
 * All encryption happens client-side. The server NEVER sees plaintext data.
 */

/**
 * Derive an AES-GCM 256-bit CryptoKey from user passphrase and salt using PBKDF2
 * @param {string} passphrase - User-provided secret passphrase
 * @param {string} salt - Salt string used to protect against rainbow table attacks
 * @returns {Promise<CryptoKey>} Derived AES-GCM 256-bit key
 */
export async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a file ArrayBuffer using AES-256-GCM with a fresh 96-bit initialization vector
 * @param {ArrayBuffer} fileBuffer - Plaintext file data buffer
 * @param {string} passphrase - User secret passphrase
 * @param {string} salt - Key derivation salt
 * @returns {Promise<{ encrypted: ArrayBuffer, iv: Uint8Array }>} Ciphertext buffer and generated IV
 */
export async function encryptFile(fileBuffer, passphrase, salt) {
  const key = await deriveKey(passphrase, salt);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    fileBuffer
  );
  return { encrypted, iv };
}

/**
 * Decrypt an encrypted ArrayBuffer using AES-256-GCM and stored base64 IV
 * @param {ArrayBuffer} encryptedBuffer - Ciphertext buffer
 * @param {string} passphrase - User secret passphrase
 * @param {string} salt - Key derivation salt
 * @param {string} ivBase64 - Base64 encoded 96-bit initialization vector
 * @returns {Promise<ArrayBuffer>} Decrypted plaintext file buffer
 */
export async function decryptFile(encryptedBuffer, passphrase, salt, ivBase64) {
  const key = await deriveKey(passphrase, salt);
  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  return window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedBuffer
  );
}

/**
 * Convert Uint8Array (IV) to base64 string for storage and transport
 * @param {Uint8Array} iv - Initialization vector byte array
 * @returns {string} Base64 encoded representation
 */
export function ivToBase64(iv) {
  return btoa(String.fromCharCode(...iv));
}

/**
 * Format raw byte length into human-readable size units (B, KB, MB, GB)
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string (e.g., '2.50 MB')
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}


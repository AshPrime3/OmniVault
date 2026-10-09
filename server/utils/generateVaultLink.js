import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique vault token for file sharing
 * @returns {string} UUID vault token
 */
export const generateVaultToken = () => {
  return uuidv4();
};

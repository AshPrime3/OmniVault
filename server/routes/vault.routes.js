import { Router } from 'express';
import { generateVaultLink, getVaultFileInfo, downloadVaultFile } from '../controllers/vault.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { downloadLimiter } from '../middlewares/rateLimit.middleware.js';

const router = Router();

// POST /api/vault/:fileId/generate — generate vault link (auth required)
router.post('/:fileId/generate', protect, generateVaultLink);

// GET /api/vault/:vaultToken — get file metadata by vault token (public)
router.get('/:vaultToken', getVaultFileInfo);

// POST /api/vault/:vaultToken/download — download encrypted file (public, rate limited)
router.post('/:vaultToken/download', downloadLimiter, downloadVaultFile);

export default router;

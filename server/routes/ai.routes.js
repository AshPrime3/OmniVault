import { Router } from 'express';
import { getSecuritySuggestion, getPassphraseHint } from '../controllers/ai.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

// POST /api/ai/security-suggest — AI recommends download limit + expiry based on filename
router.post('/security-suggest', protect, getSecuritySuggestion);

// POST /api/ai/passphrase-hint — AI generates a cryptic memorable hint for a passphrase
router.post('/passphrase-hint', protect, getPassphraseHint);

export default router;

import { Router } from 'express';
import { uploadFile, listFiles, deleteFile, getFileAudit, revokeVaultLink } from '../controllers/file.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import upload from '../middlewares/upload.middleware.js';

const router = Router();

// POST /api/files/upload — upload encrypted file
router.post('/upload', protect, upload.single('file'), uploadFile);

// GET /api/files — list all files owned by user
router.get('/', protect, listFiles);

// DELETE /api/files/:fileId — delete file
router.delete('/:fileId', protect, deleteFile);

// GET /api/files/:fileId/audit — get audit log for file
router.get('/:fileId/audit', protect, getFileAudit);

// PATCH /api/files/:fileId/revoke — revoke vault link
router.patch('/:fileId/revoke', protect, revokeVaultLink);

export default router;

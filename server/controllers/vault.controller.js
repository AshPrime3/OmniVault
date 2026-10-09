import File from '../models/File.model.js';
import AuditLog from '../models/AuditLog.model.js';
import storageService from '../config/s3.js';
import { generateVaultToken } from '../utils/generateVaultLink.js';
import logger from '../utils/logger.js';

// POST /api/vault/:fileId/generate
export const generateVaultLink = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.fileId, owner: req.user.id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const vaultToken = generateVaultToken();
    file.vaultToken = vaultToken;
    file.isRevoked = false;
    file.downloadCount = 0;
    file.downloadLimit = parseInt(req.body.downloadLimit) || 5;
    file.passphraseHint = req.body.passphraseHint || file.passphraseHint || '';
    file.expiresAt = new Date(
      Date.now() + (parseInt(req.body.expiresInMinutes) || 60) * 60 * 1000
    );
    await file.save();

    const vaultLink = `${process.env.CLIENT_URL}/vault/${vaultToken}`;

    logger.info(`Vault link generated for file: ${file.originalName}`);

    res.json({
      vaultLink,
      vaultToken,
      expiresAt: file.expiresAt,
      downloadLimit: file.downloadLimit,
    });
  } catch (error) {
    logger.error(`Generate vault link error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/vault/:vaultToken
export const getVaultFileInfo = async (req, res) => {
  try {
    const file = await File.findOne({ vaultToken: req.params.vaultToken })
      .select('originalName mimeType sizeBytes passphraseHint downloadLimit downloadCount expiresAt isRevoked createdAt');

    if (!file) {
      return res.status(404).json({ message: 'Invalid vault link' });
    }

    if (file.isRevoked) {
      return res.status(403).json({ message: 'This link has been revoked' });
    }

    if (file.expiresAt && new Date() > file.expiresAt) {
      return res.status(410).json({ message: 'This link has expired' });
    }

    if (file.downloadCount >= file.downloadLimit) {
      return res.status(403).json({ message: 'Download limit reached' });
    }

    // Log link access
    await AuditLog.create({
      fileId: file._id,
      action: 'LINK_ACCESSED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      passphraseHint: file.passphraseHint,
      downloadLimit: file.downloadLimit,
      downloadCount: file.downloadCount,
      expiresAt: file.expiresAt,
      remainingDownloads: file.downloadLimit - file.downloadCount,
    });
  } catch (error) {
    logger.error(`Get vault info error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/vault/:vaultToken/download
export const downloadVaultFile = async (req, res) => {
  try {
    const file = await File.findOne({ vaultToken: req.params.vaultToken });

    if (!file) {
      return res.status(404).json({ message: 'Invalid vault link' });
    }

    if (file.isRevoked) {
      await AuditLog.create({ fileId: file._id, action: 'FAILED_ATTEMPT', ipAddress: req.ip, userAgent: req.headers['user-agent'] });
      return res.status(403).json({ message: 'Link revoked' });
    }

    if (file.expiresAt && new Date() > file.expiresAt) {
      await AuditLog.create({ fileId: file._id, action: 'LINK_EXPIRED', ipAddress: req.ip });
      return res.status(410).json({ message: 'Link expired' });
    }

    if (file.downloadCount >= file.downloadLimit) {
      await AuditLog.create({ fileId: file._id, action: 'FAILED_ATTEMPT', ipAddress: req.ip });
      return res.status(403).json({ message: 'Download limit reached' });
    }

    // Stream encrypted blob from storage
    const storageResponse = await storageService.download(file.s3Key);

    // Increment download count
    file.downloadCount += 1;
    await file.save();

    // Audit log
    await AuditLog.create({
      fileId: file._id,
      action: 'DOWNLOADED',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    logger.info(`File downloaded via vault: ${file.originalName}`);

    // Set headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('x-file-iv', file.iv);
    res.setHeader('x-original-name', encodeURIComponent(file.originalName));
    res.setHeader('Access-Control-Expose-Headers', 'x-file-iv, x-original-name');

    // Stream the encrypted blob
    storageResponse.Body.pipe(res);
  } catch (error) {
    logger.error(`Download vault file error: ${error.message}`);
    res.status(500).json({ message: 'Server error during download' });
  }
};

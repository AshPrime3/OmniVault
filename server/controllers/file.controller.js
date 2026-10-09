import { v4 as uuidv4 } from 'uuid';
import File from '../models/File.model.js';
import AuditLog from '../models/AuditLog.model.js';
import User from '../models/User.model.js';
import storageService from '../config/s3.js';
import logger from '../utils/logger.js';

// POST /api/files/upload
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const { iv, originalName, mimeType, sizeBytes, downloadLimit, expiresInMinutes, passphraseHint } = req.body;

    if (!iv || !originalName) {
      return res.status(400).json({ message: 'IV and originalName are required' });
    }

    const s3Key = `encrypted/${req.user.id}/${uuidv4()}`;

    // Upload encrypted blob to storage (S3 or local)
    await storageService.upload(s3Key, req.file.buffer, 'application/octet-stream');

    const file = await File.create({
      owner: req.user.id,
      originalName,
      mimeType: mimeType || 'application/octet-stream',
      sizeBytes: parseInt(sizeBytes) || req.file.size,
      s3Key,
      iv,
      passphraseHint: passphraseHint || '',
      downloadLimit: parseInt(downloadLimit) || 5,
      expiresAt: expiresInMinutes
        ? new Date(Date.now() + parseInt(expiresInMinutes) * 60 * 1000)
        : null,
    });

    // Update user storage
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { storageUsed: parseInt(sizeBytes) || req.file.size },
    });

    // Audit log
    await AuditLog.create({
      fileId: file._id,
      action: 'UPLOADED',
      performedBy: req.user.id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    logger.info(`File uploaded: ${originalName} by user ${req.user.id}`);

    res.status(201).json({
      fileId: file._id,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    logger.error(`Upload error: ${error.message}`);
    res.status(500).json({ message: 'Server error during file upload' });
  }
};

// GET /api/files
export const listFiles = async (req, res) => {
  try {
    const files = await File.find({ owner: req.user.id })
      .select('-s3Key')
      .sort({ createdAt: -1 });

    res.json({ files });
  } catch (error) {
    logger.error(`List files error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/files/:fileId
export const deleteFile = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.fileId, owner: req.user.id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Delete from storage
    await storageService.delete(file.s3Key);

    // Update user storage
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { storageUsed: -file.sizeBytes },
    });

    // Delete file record
    await File.deleteOne({ _id: file._id });

    logger.info(`File deleted: ${file.originalName} by user ${req.user.id}`);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    logger.error(`Delete file error: ${error.message}`);
    res.status(500).json({ message: 'Server error during file deletion' });
  }
};

// GET /api/files/:fileId/audit
export const getFileAudit = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.fileId, owner: req.user.id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    const logs = await AuditLog.find({ fileId: req.params.fileId })
      .sort({ timestamp: -1 })
      .populate('performedBy', 'name email');

    res.json({ logs });
  } catch (error) {
    logger.error(`Audit log error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

// PATCH /api/files/:fileId/revoke
export const revokeVaultLink = async (req, res) => {
  try {
    const file = await File.findOne({ _id: req.params.fileId, owner: req.user.id });
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    file.isRevoked = true;
    await file.save();

    await AuditLog.create({
      fileId: file._id,
      action: 'LINK_REVOKED',
      performedBy: req.user.id,
      ipAddress: req.ip,
    });

    logger.info(`Vault link revoked for file: ${file.originalName}`);

    res.json({ message: 'Vault link revoked successfully' });
  } catch (error) {
    logger.error(`Revoke error: ${error.message}`);
    res.status(500).json({ message: 'Server error' });
  }
};

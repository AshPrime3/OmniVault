import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
  },
  action: {
    type: String,
    enum: ['UPLOADED', 'DOWNLOADED', 'LINK_ACCESSED', 'LINK_EXPIRED', 'LINK_REVOKED', 'FAILED_ATTEMPT'],
    required: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // null for anonymous downloads
  },
  ipAddress: {
    type: String,
    default: '',
  },
  userAgent: {
    type: String,
    default: '',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;

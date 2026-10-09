import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  sizeBytes: {
    type: Number,
    required: true,
  },
  s3Key: {
    type: String,
    required: true,
  },
  iv: {
    type: String,
    required: true, // AES-GCM IV, base64 encoded
  },
  vaultToken: {
    type: String,
    unique: true,
    sparse: true, // allows multiple nulls
  },
  passphraseHint: {
    type: String,
    default: '',
  },
  downloadLimit: {
    type: Number,
    default: 5,
  },
  downloadCount: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    default: null, // null = no expiry
  },
  isRevoked: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const File = mongoose.model('File', fileSchema);
export default File;

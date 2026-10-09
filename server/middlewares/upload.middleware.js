import multer from 'multer';

// Use memory storage — encrypted blob stays in buffer, never saved to disk unencrypted
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

export default upload;

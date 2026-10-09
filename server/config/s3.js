import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import logger from '../utils/logger.js';

const isLocalMode =
  !process.env.AWS_ACCESS_KEY_ID ||
  process.env.AWS_ACCESS_KEY_ID === 'your_aws_access_key' ||
  process.env.NODE_ENV === 'development';

let s3Client;
if (!isLocalMode) {
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  logger.info('AWS S3 client initialized');
} else {
  logger.info('Using local filesystem storage (S3 credentials not configured)');
}

const LOCAL_STORAGE_DIR = path.join(process.cwd(), 'local-storage');

// Ensure local storage directory exists
if (isLocalMode && !fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true });
}

/**
 * Storage service that abstracts S3 vs local filesystem
 */
const storageService = {
  async upload(key, body, contentType = 'application/octet-stream') {
    if (isLocalMode) {
      const filePath = path.join(LOCAL_STORAGE_DIR, key.replace(/\//g, '_'));
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, Buffer.from(body));
      logger.info(`File stored locally: ${filePath}`);
      return { key };
    }

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    );
    logger.info(`File uploaded to S3: ${key}`);
    return { key };
  },

  async download(key) {
    if (isLocalMode) {
      const filePath = path.join(LOCAL_STORAGE_DIR, key.replace(/\//g, '_'));
      if (!fs.existsSync(filePath)) {
        throw new Error('File not found in local storage');
      }
      const buffer = fs.readFileSync(filePath);
      return { Body: Readable.from(buffer) };
    }

    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      })
    );
    return response;
  },

  async delete(key) {
    if (isLocalMode) {
      const filePath = path.join(LOCAL_STORAGE_DIR, key.replace(/\//g, '_'));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`File deleted from local storage: ${filePath}`);
      }
      return;
    }

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
      })
    );
    logger.info(`File deleted from S3: ${key}`);
  },
};

export default storageService;

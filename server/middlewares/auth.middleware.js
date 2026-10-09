import jwt from 'jsonwebtoken';
import redisService from '../config/redis.js';

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  // Check if token is blacklisted in Redis
  const isBlacklisted = await redisService.get(`blacklist:${token}`);
  if (isBlacklisted) {
    return res.status(401).json({ message: 'Token revoked' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

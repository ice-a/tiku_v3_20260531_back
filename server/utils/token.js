import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Generate access token
 * @param {Object} payload - { userId, role }
 * @returns {string} JWT access token
 */
export function generateAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
}

/**
 * Generate refresh token
 * @param {Object} payload - { userId }
 * @returns {string} JWT refresh token
 */
export function generateRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn
  });
}

/**
 * Verify refresh token
 * @param {string} token - refresh token string
 * @returns {Object} decoded payload
 * @throws {Error} if token is invalid or expired
 */
export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret);
}

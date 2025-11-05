import crypto from 'crypto';

/**
 * Security utility functions for the SIRTI Inventory Management System
 */

/**
 * Generate a secure random string
 * @param {number} length - The length of the string to generate
 * @returns {string} - A secure random string
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash a password using bcrypt-compatible method
 * @param {string} password - The password to hash
 * @returns {Promise<string>} - The hashed password
 */
export async function hashPassword(password) {
  const bcrypt = await import('bcryptjs');
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 * @param {string} password - The plain password
 * @param {string} hash - The hashed password
 * @returns {Promise<boolean>} - Whether the password matches
 */
export async function verifyPassword(password, hash) {
  const bcrypt = await import('bcryptjs');
  return bcrypt.compare(password, hash);
}

/**
 * Sanitize filename for safe file storage
 * @param {string} filename - The original filename
 * @returns {string} - A sanitized filename
 */
export function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-alphanumeric chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 100); // Limit length
}

/**
 * Validate email format
 * @param {string} email - The email to validate
 * @returns {boolean} - Whether the email is valid
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate password strength
 * @param {string} password - The password to validate
 * @returns {object} - Validation result with isValid and reasons
 */
export function validatePasswordStrength(password) {
  const result = {
    isValid: true,
    reasons: []
  };

  if (password.length < 8) {
    result.isValid = false;
    result.reasons.push('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    result.isValid = false;
    result.reasons.push('Password must be less than 128 characters');
  }

  if (!/[a-z]/.test(password)) {
    result.reasons.push('Password should contain lowercase letters');
  }

  if (!/[A-Z]/.test(password)) {
    result.reasons.push('Password should contain uppercase letters');
  }

  if (!/[0-9]/.test(password)) {
    result.reasons.push('Password should contain numbers');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    result.reasons.push('Password should contain special characters');
  }

  return result;
}

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate MongoDB ObjectId format
 * @param {string} id - The ID to validate
 * @returns {boolean} - Whether the ID is valid
 */
export function isValidObjectId(id) {
  const objectIdRegex = /^[0-9a-fA-F]{24}$/;
  return objectIdRegex.test(id);
}

/**
 * Generate Content Security Policy header value
 * @returns {string} - CSP header value
 */
export function generateCSPHeader() {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  constructor() {
    this.requests = new Map();
  }

  /**
   * Check if request should be rate limited
   * @param {string} key - Unique identifier for the rate limit
   * @param {number} windowMs - Time window in milliseconds
   * @param {number} maxRequests - Maximum requests allowed in window
   * @returns {object} - { allowed: boolean, remaining: number, resetTime: number }
   */
  check(key, windowMs = 60000, maxRequests = 100) {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }

    const requests = this.requests.get(key);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => time > windowStart);
    this.requests.set(key, validRequests);

    const remaining = Math.max(0, maxRequests - validRequests.length);
    const allowed = validRequests.length < maxRequests;

    if (allowed) {
      validRequests.push(now);
    }

    return {
      allowed,
      remaining,
      resetTime: windowStart + windowMs
    };
  }

  /**
   * Clear old entries to prevent memory leaks
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > now - maxAge);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

/**
 * Security event logger
 */
export class SecurityLogger {
  /**
   * Log a security event
   * @param {string} event - The event type
   * @param {object} details - Event details
   * @param {string} severity - Event severity (info, warn, error, critical)
   */
  static log(event, details = {}, severity = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      details,
      userAgent: details.userAgent || 'unknown',
      ip: details.ip || 'unknown'
    };

    const logMessage = `[SECURITY-${severity.toUpperCase()}] ${event}: ${JSON.stringify(details)}`;

    switch (severity) {
      case 'error':
      case 'critical':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }

    // In production, you might want to send this to an external logging service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with external logging service (e.g., Datadog, LogRocket, etc.)
    }
  }

  /**
   * Log authentication events
   */
  static logAuth(event, userId, details = {}) {
    this.log(`AUTH_${event}`, { userId, ...details }, 'info');
  }

  /**
   * Log authorization events
   */
  static logAuthz(event, userId, resource, details = {}) {
    this.log(`AUTHZ_${event}`, { userId, resource, ...details }, 'warn');
  }

  /**
   * Log security violations
   */
  static logViolation(event, details = {}) {
    this.log(`VIOLATION_${event}`, details, 'error');
  }
}

/**
 * Input validation helpers
 */
export const validators = {
  /**
   * Validate role
   */
  role: (role) => ['admin', 'manager', 'keeper', 'staff'].includes(role),

  /**
   * Validate contact number
   */
  contactNumber: (contact) => /^[\d\s\+\-\(\)]+$/.test(contact),

  /**
   * Validate product code
   */
  productCode: (code) => /^[A-Z0-9\-_]{1,20}$/i.test(code),

  /**
   * Validate numeric input
   */
  number: (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
    const num = Number(value);
    return !isNaN(num) && num >= min && num <= max;
  },

  /**
   * Validate string length
   */
  stringLength: (str, min = 0, max = 255) => {
    return typeof str === 'string' && str.length >= min && str.length <= max;
  }
};

const securityUtils = {
  generateSecureToken,
  hashPassword,
  verifyPassword,
  sanitizeFilename,
  isValidEmail,
  validatePasswordStrength,
  sanitizeInput,
  isValidObjectId,
  generateCSPHeader,
  RateLimiter,
  SecurityLogger,
  validators
};

export default securityUtils;

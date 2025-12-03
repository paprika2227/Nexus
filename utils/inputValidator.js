// Input validation and sanitization for security
const logger = require("./logger");

class InputValidator {
  /**
   * Sanitize string input
   */
  static sanitizeString(input, maxLength = 2000) {
    if (typeof input !== "string") return "";

    // Remove null bytes and control characters
    let sanitized = input.replace(/\0/g, "").replace(/[\x00-\x1F\x7F]/g, "");

    // Trim and limit length
    sanitized = sanitized.trim().substring(0, maxLength);

    return sanitized;
  }

  /**
   * Validate Discord ID (snowflake)
   */
  static isValidDiscordId(id) {
    if (typeof id !== "string") return false;
    return /^\d{17,19}$/.test(id);
  }

  /**
   * Validate email
   */
  static isValidEmail(email) {
    if (typeof email !== "string") return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 320;
  }

  /**
   * Sanitize for SQL (prevent injection - though we use prepared statements)
   */
  static sanitizeSQL(input) {
    if (typeof input !== "string") return "";
    // Remove SQL injection attempts
    return input.replace(/['";\\]/g, "");
  }

  /**
   * Validate number input
   */
  static isValidNumber(input, min = null, max = null) {
    const num = Number(input);
    if (isNaN(num)) return false;
    if (min !== null && num < min) return false;
    if (max !== null && num > max) return false;
    return true;
  }

  /**
   * Sanitize URL
   */
  static isValidURL(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Check for common attack patterns
   */
  static containsSuspiciousPatterns(input) {
    if (typeof input !== "string") return false;

    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i, // Event handlers
      /eval\(/i,
      /exec\(/i,
      /\$\{.*\}/, // Template injection
      /\.\.\//, // Path traversal
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(input));
  }

  /**
   * Validate and sanitize user input
   */
  static validateInput(input, type = "string", options = {}) {
    const { maxLength = 2000, required = false, min, max } = options;

    // Check required
    if (required && (input === null || input === undefined || input === "")) {
      throw new Error("This field is required");
    }

    // Type-specific validation
    switch (type) {
      case "string":
        const sanitized = this.sanitizeString(input, maxLength);
        if (this.containsSuspiciousPatterns(sanitized)) {
          logger.warn(
            `[Security] Suspicious input detected: ${sanitized.substring(
              0,
              100
            )}`
          );
          throw new Error("Input contains potentially malicious content");
        }
        return sanitized;

      case "number":
        if (!this.isValidNumber(input, min, max)) {
          throw new Error(
            `Invalid number. Must be between ${min || "-∞"} and ${max || "∞"}`
          );
        }
        return Number(input);

      case "discord_id":
        if (!this.isValidDiscordId(input)) {
          throw new Error("Invalid Discord ID format");
        }
        return input;

      case "email":
        if (!this.isValidEmail(input)) {
          throw new Error("Invalid email format");
        }
        return input.toLowerCase();

      case "url":
        if (!this.isValidURL(input)) {
          throw new Error("Invalid URL format");
        }
        return input;

      default:
        return input;
    }
  }

  /**
   * Batch validate multiple inputs
   */
  static validateBatch(inputs) {
    const errors = [];
    const validated = {};

    for (const [key, config] of Object.entries(inputs)) {
      try {
        validated[key] = this.validateInput(
          config.value,
          config.type,
          config.options || {}
        );
      } catch (error) {
        errors.push({ field: key, error: error.message });
      }
    }

    if (errors.length > 0) {
      throw new Error(
        `Validation failed:\n${errors
          .map((e) => `- ${e.field}: ${e.error}`)
          .join("\n")}`
      );
    }

    return validated;
  }
}

module.exports = InputValidator;

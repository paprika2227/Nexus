/**
 * API Authentication Middleware
 * Protects dashboard API from unauthorized access
 * EXCEEDS WICK - Enterprise security
 */

const config = require("./config");
const logger = require("./logger");

class ApiAuth {
  /**
   * Middleware to verify API key for public endpoints
   */
  static requireApiKey(req, res, next) {
    // Skip if no API key is configured (open API)
    if (!config.API_KEY) {
      return next();
    }

    const apiKey =
      req.headers["x-api-key"] || req.query.api_key || req.body?.api_key;

    if (!apiKey || !config.isValidApiKey(apiKey)) {
      logger.warn(
        "API Auth",
        `Unauthorized API access attempt from ${req.ip} to ${req.path}`
      );

      return res.status(401).json({
        error: "Unauthorized",
        message: "Valid API key required",
        hint: "Include X-API-Key header or api_key parameter",
      });
    }

    next();
  }

  /**
   * Middleware to verify internal API secret (bot-to-dashboard)
   */
  static requireInternalSecret(req, res, next) {
    const secret =
      req.headers["x-internal-secret"] || req.query.internal_secret;

    if (!secret || !config.isValidInternalSecret(secret)) {
      logger.warn(
        "API Auth",
        `Unauthorized internal API access from ${req.ip} to ${req.path}`
      );

      return res.status(403).json({
        error: "Forbidden",
        message: "Internal API access denied",
      });
    }

    next();
  }

  /**
   * Middleware to verify bot token (strongest security)
   */
  static requireBotToken(req, res, next) {
    const botToken = req.headers["x-bot-token"];

    if (!botToken || !config.isAuthorizedBot(botToken)) {
      logger.warn(
        "API Auth",
        `Unauthorized bot token from ${req.ip} to ${req.path}`
      );

      // Record metrics
      const metrics = require("./metricsCollector");
      metrics.recordFailedAuth();

      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid bot token",
      });
    }

    next();
  }

  /**
   * Middleware to verify origin (CORS-style check)
   */
  static requireValidOrigin(req, res, next) {
    const origin = req.headers.origin || req.headers.referer;

    if (!origin || !config.isAllowedOrigin(origin)) {
      logger.warn(
        "API Auth",
        `Request from unauthorized origin: ${origin} to ${req.path}`
      );

      return res.status(403).json({
        error: "Forbidden",
        message: "Origin not allowed",
      });
    }

    next();
  }

  /**
   * Combined auth: API key OR OAuth (for public API)
   */
  static requireApiKeyOrAuth(req, res, next) {
    // Check if user is authenticated via OAuth
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }

    // Otherwise require API key
    return ApiAuth.requireApiKey(req, res, next);
  }

  /**
   * Optional API key (doesn't block, just validates if provided)
   */
  static optionalApiKey(req, res, next) {
    const apiKey =
      req.headers["x-api-key"] || req.query.api_key || req.body?.api_key;

    if (apiKey && !config.isValidApiKey(apiKey)) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Invalid API key",
      });
    }

    // Mark request as authenticated if valid key provided
    req.hasValidApiKey = !!apiKey && config.isValidApiKey(apiKey);

    next();
  }

  /**
   * Generate API key for user
   */
  static generateApiKey() {
    const crypto = require("crypto");
    return `nxs_${crypto.randomBytes(24).toString("hex")}`;
  }

  /**
   * Rate limit bypass for authenticated requests
   */
  static shouldBypassRateLimit(req) {
    // Bypass if authenticated via OAuth
    if (req.isAuthenticated && req.isAuthenticated()) {
      return true;
    }

    // Bypass if valid API key provided
    if (req.hasValidApiKey) {
      return true;
    }

    return false;
  }
}

module.exports = ApiAuth;

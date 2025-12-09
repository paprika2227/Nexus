/**
 * Centralized Configuration
 * Environment-based settings with secure defaults
 * EXCEEDS WICK - Proper configuration management
 */

require("dotenv").config();

module.exports = {
  // Bot Identity
  BOT_NAME: process.env.BOT_NAME || "Nexus",
  BOT_VERSION: require("../package.json").version,

  // URLs (configurable but default to official)
  WEBSITE_URL: process.env.WEBSITE_URL || "https://azzraya.github.io/Nexus",
  GITHUB_PAGES_URL: process.env.GITHUB_PAGES_URL || "https://azzraya.github.io",
  DASHBOARD_URL: process.env.DASHBOARD_URL || "",
  SUPPORT_SERVER: process.env.SUPPORT_SERVER || "https://discord.gg/warmA4BsPP",

  // API Security
  API_KEY: process.env.API_KEY || null, // Optional API key for public endpoints
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  INTERNAL_API_SECRET: process.env.INTERNAL_API_SECRET || this.generateSecret(), // For bot-to-dashboard auth

  // Features
  ENABLE_PUBLIC_API: process.env.ENABLE_PUBLIC_API !== "false", // Default: enabled
  ENABLE_METRICS: process.env.ENABLE_METRICS !== "false", // Default: enabled
  ENABLE_HEALTH_CHECKS: process.env.ENABLE_HEALTH_CHECKS !== "false", // Default: enabled

  // Security Settings
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : null, // Comma-separated list
  RATE_LIMIT_ENABLED: process.env.RATE_LIMIT_ENABLED !== "false", // Default: enabled

  // Redis
  REDIS_URL: process.env.REDIS_URL || null,

  // Helper Methods
  getInviteUrl(source = "direct") {
    return `${this.WEBSITE_URL}/invite.html?source=${source}`;
  },

  getComparisonUrl() {
    return `${this.WEBSITE_URL}/comparison.html`;
  },

  getDocsUrl() {
    return `${this.WEBSITE_URL}/docs.html`;
  },

  getCommandsUrl() {
    return `${this.WEBSITE_URL}/commands.html`;
  },

  getApiDocsUrl() {
    return `${this.WEBSITE_URL}/api.html`;
  },

  getVoteFeaturesUrl() {
    return `${this.WEBSITE_URL}/vote-features.html`;
  },

  // Generate a random secret if not provided
  generateSecret() {
    return require("crypto").randomBytes(32).toString("hex");
  },

  // Validate request origin
  isAllowedOrigin(origin) {
    if (!origin) return false;

    // If custom allowed origins are set, use those
    if (this.ALLOWED_ORIGINS) {
      return this.ALLOWED_ORIGINS.includes(origin);
    }

    // Default allowed origins
    const defaultAllowed = [
      this.GITHUB_PAGES_URL,
      this.WEBSITE_URL,
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      this.DASHBOARD_URL,
    ].filter(Boolean);

    return (
      defaultAllowed.includes(origin) || origin.startsWith("http://localhost")
    );
  },

  // Validate API key (for public API endpoints)
  isValidApiKey(key) {
    // If no API key is set, allow all (for open API)
    if (!this.API_KEY) return true;

    return key === this.API_KEY;
  },

  // Validate internal API secret (for bot-to-dashboard communication)
  isValidInternalSecret(secret) {
    return secret === this.INTERNAL_API_SECRET;
  },

  // Check if request is from authorized bot
  isAuthorizedBot(botToken) {
    // Verify the request comes from OUR bot
    return botToken === this.DISCORD_TOKEN;
  },
};

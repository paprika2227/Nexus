const express = require("express");
const logger = require("./logger");
const db = require("./database");

class WebhookServer {
  constructor(client) {
    this.client = client;
    this.app = express();
    this.port = process.env.WEBHOOK_PORT || 3001;
    this.setupRoutes();
  }

  setupRoutes() {
    // Middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Health check
    this.app.get("/health", (req, res) => {
      res.json({ status: "ok", service: "nexus-webhook" });
    });

    // Verification webhook
    this.app.post("/webhook/verify", async (req, res) => {
      try {
        const { token, verificationId } = req.body;

        if (!token || !verificationId) {
          return res.status(400).json({
            success: false,
            error: "Token and verification ID required",
          });
        }

        // Get verification from database
        const verification = await new Promise((resolve, reject) => {
          db.db.get(
            "SELECT * FROM verification_tokens WHERE token = ? AND verification_id = ? AND used = 0 AND expires_at > ?",
            [token, verificationId, Date.now()],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (!verification) {
          return res.json({
            success: false,
            error: "Invalid, expired, or already used token",
          });
        }

        // Complete verification using VerificationSystem
        const result = await this.client.verificationSystem.completeVerification(
          verificationId
        );

        if (result.success) {
          // Mark token as used
          await new Promise((resolve, reject) => {
            db.db.run(
              "UPDATE verification_tokens SET used = 1 WHERE token = ?",
              [token],
              (err) => {
                if (err) reject(err);
                else resolve();
              }
            );
          });

          logger.info(
            `[Webhook] Verification completed for user ${verification.user_id} in guild ${verification.guild_id}`
          );

          return res.json({
            success: true,
            message: "Verification completed successfully",
          });
        } else {
          return res.json({
            success: false,
            error: result.reason || "Verification failed",
          });
        }
      } catch (error) {
        logger.error("[Webhook] Error processing verification:", error);
        return res.status(500).json({
          success: false,
          error: "Internal server error",
        });
      }
    });

    // Error handling
    this.app.use((err, req, res, next) => {
      logger.error("[Webhook] Unhandled error:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    });
  }

  start() {
    this.app.listen(this.port, () => {
      logger.info(
        `[Webhook] Verification webhook server running on port ${this.port}`
      );
      logger.info(
        `[Webhook] Webhook URL: http://localhost:${this.port}/webhook/verify`
      );
    });
  }

  stop() {
    if (this.server) {
      this.server.close();
      logger.info("[Webhook] Webhook server stopped");
    }
  }
}

module.exports = WebhookServer;


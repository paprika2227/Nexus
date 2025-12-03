const express = require("express");
const session = require("express-session");
const passport = require("passport");
const DiscordStrategy = require("passport-discord").Strategy;
const path = require("path");
const db = require("../utils/database");

class DashboardServer {
  constructor(client) {
    this.client = client;
    this.app = express();

    // Middleware
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, "public")));

    // CORS for GitHub Pages and localhost
    this.app.use((req, res, next) => {
      const origin = req.headers.origin;
      const allowedOrigins = [
        "https://azzraya.github.io",
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "null", // For local file:// protocol
      ];

      if (
        allowedOrigins.includes(origin) ||
        (origin && origin.startsWith("http://localhost"))
      ) {
        res.header("Access-Control-Allow-Origin", origin);
      } else {
        res.header("Access-Control-Allow-Origin", "https://azzraya.github.io");
      }

      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, ngrok-skip-browser-warning"
      );
      res.header("Access-Control-Allow-Credentials", "true");

      if (req.method === "OPTIONS") {
        return res.sendStatus(200);
      }
      next();
    });

    // Session
    this.app.use(
      session({
        secret:
          "UaX@Q!3WEUGrEdYNATe*QbEWdtzevt9&3saDtZ0T4s^w@jpjvSx8tCwBh6M6xqDF",
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 7 days
      })
    );

    // Passport
    this.app.use(passport.initialize());
    this.app.use(passport.session());

    this.setupAuth();
    this.setupRoutes();
  }

  setupAuth() {
    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    passport.use(
      new DiscordStrategy(
        {
          clientID: process.env.CLIENT_ID || "1444739230679957646",
          clientSecret: process.env.CLIENT_SECRET,
          callbackURL: process.env.DASHBOARD_URL + "/callback",
          scope: ["identify", "guilds"],
        },
        (accessToken, refreshToken, profile, done) => {
          return done(null, profile);
        }
      )
    );
  }

  setupRoutes() {
    // Auth routes
    this.app.get("/login", passport.authenticate("discord"));

    this.app.get(
      "/callback",
      passport.authenticate("discord", { failureRedirect: "/" }),
      (req, res) => res.redirect("/dashboard")
    );

    this.app.get("/logout", (req, res) => {
      req.logout(() => res.redirect("/"));
    });

    // Dashboard route
    this.app.get("/dashboard", this.checkAuth, (req, res) => {
      res.sendFile(path.join(__dirname, "public", "dashboard.html"));
    });

    // API Routes
    this.app.get("/api/user", this.checkAuth, (req, res) => {
      res.json(req.user);
    });

    this.app.get("/api/servers", this.checkAuth, async (req, res) => {
      try {
        const userGuilds = req.user.guilds || [];
        const botGuilds = this.client.guilds.cache;

        // Get all servers where user has admin permissions
        const adminGuilds = userGuilds
          .filter((g) => (g.permissions & 0x8) === 0x8) // ADMINISTRATOR
          .map((ug) => {
            const botGuild = botGuilds.get(ug.id);

            if (botGuild) {
              // Bot is present
              return {
                id: ug.id,
                name: ug.name,
                icon: ug.icon
                  ? `https://cdn.discordapp.com/icons/${ug.id}/${ug.icon}.png`
                  : null,
                memberCount: botGuild.memberCount,
                ownerId: botGuild.ownerId,
                hasBot: true,
                canManage: true,
              };
            } else {
              // Bot is NOT present
              return {
                id: ug.id,
                name: ug.name,
                icon: ug.icon
                  ? `https://cdn.discordapp.com/icons/${ug.id}/${ug.icon}.png`
                  : null,
                memberCount: null, // Unknown
                ownerId: null,
                hasBot: false,
                canManage: false,
              };
            }
          });

        res.json(adminGuilds);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get("/api/server/:id", this.checkAuth, async (req, res) => {
      try {
        const guild = this.client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: "Server not found" });

        const db = require("../utils/database");
        const config = await db.getServerConfig(guild.id);

        res.json({
          id: guild.id,
          name: guild.name,
          icon: guild.iconURL(),
          memberCount: guild.memberCount,
          ownerId: guild.ownerId,
          config: config || {},
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update server config
    this.app.post(
      "/api/server/:id/config",
      this.checkAuth,
      async (req, res) => {
        try {
          const guild = this.client.guilds.cache.get(req.params.id);
          if (!guild)
            return res.status(404).json({ error: "Server not found" });

          const updates = req.body;
          await db.setServerConfig(guild.id, updates);

          res.json({ success: true });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      }
    );

    // Get moderation logs
    this.app.get(
      "/api/server/:id/modlogs",
      this.checkAuth,
      async (req, res) => {
        try {
          const limit = parseInt(req.query.limit) || 50;
          const userId = req.query.userId || null;
          const logs = await db.getModLogs(req.params.id, userId, limit);
          res.json(logs);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      }
    );

    // Get warnings for a user
    this.app.get(
      "/api/server/:id/warnings",
      this.checkAuth,
      async (req, res) => {
        try {
          const userId = req.query.userId;
          if (!userId)
            return res.status(400).json({ error: "userId required" });

          const warnings = await db.getWarnings(req.params.id, userId);
          res.json(warnings);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      }
    );

    // Get security logs
    this.app.get(
      "/api/server/:id/security",
      this.checkAuth,
      async (req, res) => {
        try {
          const logs = await db.searchLogs(req.params.id, {
            category: "security",
            limit: parseInt(req.query.limit) || 50,
          });
          res.json(logs);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      }
    );

    // Get anti-raid statistics
    this.app.get(
      "/api/server/:id/antiraid",
      this.checkAuth,
      async (req, res) => {
        try {
          const logs = await new Promise((resolve, reject) => {
            db.db.all(
              "SELECT COUNT(*) as total FROM anti_raid_logs WHERE guild_id = ?",
              [req.params.id],
              (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]);
              }
            );
          });
          res.json({ raidsBlocked: logs.total || 0 });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      }
    );

    // Get server statistics
    this.app.get("/api/server/:id/stats", this.checkAuth, async (req, res) => {
      try {
        const guild = this.client.guilds.cache.get(req.params.id);
        if (!guild) return res.status(404).json({ error: "Server not found" });

        // Get counts from database
        const [modLogsCount, warningsCount, securityLogsCount, antiRaidCount] =
          await Promise.all([
            new Promise((resolve) => {
              db.db.get(
                "SELECT COUNT(*) as count FROM moderation_logs WHERE guild_id = ?",
                [req.params.id],
                (err, row) => resolve(row?.count || 0)
              );
            }),
            new Promise((resolve) => {
              db.db.get(
                "SELECT COUNT(*) as count FROM warnings WHERE guild_id = ?",
                [req.params.id],
                (err, row) => resolve(row?.count || 0)
              );
            }),
            new Promise((resolve) => {
              db.db.get(
                "SELECT COUNT(*) as count FROM security_logs WHERE guild_id = ?",
                [req.params.id],
                (err, row) => resolve(row?.count || 0)
              );
            }),
            new Promise((resolve) => {
              db.db.get(
                "SELECT COUNT(*) as count FROM anti_raid_logs WHERE guild_id = ?",
                [req.params.id],
                (err, row) => resolve(row?.count || 0)
              );
            }),
          ]);

        res.json({
          memberCount: guild.memberCount,
          modActions: modLogsCount,
          warnings: warningsCount,
          threatsDetected: securityLogsCount,
          raidsBlocked: antiRaidCount,
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get recovery snapshots
    this.app.get(
      "/api/server/:id/snapshots",
      this.checkAuth,
      async (req, res) => {
        try {
          const snapshots = await db.getRecoverySnapshots(req.params.id, 10);
          res.json(snapshots);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      }
    );

    // Admin authentication
    this.app.post("/api/admin/auth", async (req, res) => {
      try {
        const { password } = req.body;
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) {
          return res
            .status(500)
            .json({ error: "Admin password not configured" });
        }

        if (password === adminPassword) {
          // Generate simple token (in production, use JWT)
          const token = Buffer.from(`admin:${Date.now()}`).toString("base64");
          res.json({ success: true, token });
        } else {
          res.status(401).json({ error: "Invalid password" });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Create incident (admin only)
    this.app.post("/api/admin/incidents", async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const incident = {
          id: Date.now(),
          ...req.body,
        };

        // In a real app, you'd save this to a database
        // For now, we'll just return success and let the admin update incidents.json manually
        res.json({ success: true, incident });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get("/api/stats", (req, res) => {
      try {
        const stats = {
          servers: this.client.guilds.cache.size,
          users: this.client.guilds.cache.reduce(
            (acc, g) => acc + g.memberCount,
            0
          ),
          uptime: Math.floor(this.client.uptime / 1000),
          ping: this.client.ws.ping,
          memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        };
        res.json(stats);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Home route
    this.app.get("/", (req, res) => {
      if (req.isAuthenticated()) {
        return res.redirect("/dashboard");
      }
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });
  }

  checkAuth(req, res, next) {
    if (req.isAuthenticated()) return next();
    res.status(401).json({ error: "Unauthorized" });
  }

  start(port = 3000) {
    this.app.listen(port, () => {
      console.log(`[Dashboard] Running on http://localhost:${port}`);
      console.log(
        `[Dashboard] Ngrok URL: ${
          process.env.DASHBOARD_URL || "Set DASHBOARD_URL in .env"
        }`
      );
    });
  }
}

module.exports = DashboardServer;

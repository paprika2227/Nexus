const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const logger = require("./logger");

async function registerCommands(client) {
  if (!process.env.DISCORD_TOKEN) {
    logger.error("❌ DISCORD_TOKEN not found in .env file!");
    return;
  }

  if (!client.user) {
    logger.error("❌ Client not ready yet!");
    return;
  }

  const commands = [];
  const commandsPath = path.join(__dirname, "..", "commands");

  // Load all command files
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    try {
      const command = require(`../commands/${file}`);
      if (command.data) {
        commands.push(command.data.toJSON());
      }
    } catch (error) {
      logger.error(`⚠️ Failed to load command ${file}:`, {
        message: error?.message || String(error),
        stack: error?.stack,
        name: error?.name,
      });
    }
  }

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  try {
    logger.info("Commands", `Registering ${commands.length} slash commands...`);

    // FIRST: Clear all global commands to prevent duplicates
    try {
      await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
      logger.success("Commands", "Cleared global commands");
    } catch (error) {
      logger.error("⚠️ Failed to clear global commands:", {
        message: error?.message || String(error),
        stack: error?.stack,
        name: error?.name,
      });
    }

    // THEN: Register commands per-guild only (instant, no duplicates)
    // Process ALL guilds in parallel for maximum speed
    const guilds = Array.from(client.guilds.cache.values());
    let successCount = 0;
    let failCount = 0;

    logger.info(
      "Commands",
      `Registering commands for ${guilds.length} servers in parallel...`
    );

    // Add overall timeout wrapper to prevent hanging forever (60 seconds max)
    let results;
    try {
      const registrationPromise = Promise.allSettled(
        guilds.map(async (guild) => {
          try {
            await rest.put(
              Routes.applicationGuildCommands(client.user.id, guild.id),
              { body: commands }
            );
            return { success: true, guild: guild.name };
          } catch (error) {
            return { success: false, guild: guild.name, error };
          }
        })
      );

      // Race against overall timeout
      results = await Promise.race([
        registrationPromise,
        new Promise((resolve) =>
          setTimeout(() => {
            logger.warn(
              "Commands",
              `⚠️ Registration timeout after 60s - continuing anyway`
            );
            resolve(
              guilds.map((guild) => ({
                status: "fulfilled",
                value: {
                  success: false,
                  guild: guild.name,
                  error: { message: "Overall timeout after 60s" },
                },
              }))
            );
          }, 60000)
        ),
      ]);
    } catch (error) {
      logger.error("Commands", `Critical error during registration:`, error);
      // Continue with empty results
      results = guilds.map((guild) => ({
        status: "fulfilled",
        value: {
          success: false,
          guild: guild.name,
          error: { message: error.message || "Unknown error" },
        },
      }));
    }

    // Count successes and failures
    let rateLimitedCount = 0;
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && result.value.success) {
        successCount++;
      } else {
        failCount++;
        const guildName = guilds[index]?.name || "Unknown";
        const error =
          result.status === "fulfilled" ? result.value.error : result.reason;

        // Check if it's a rate limit error
        const isRateLimit =
          error?.code === 429 ||
          error?.status === 429 ||
          error?.message?.includes("rate limit") ||
          error?.message?.includes("429");

        if (isRateLimit) {
          rateLimitedCount++;
          const retryAfter =
            error?.retryAfter || error?.retry_after || "unknown";
          logger.warn(
            `⚠️ Rate limited while registering commands for ${guildName} (retry after: ${retryAfter}s)`
          );
        } else {
          logger.error(
            `❌ Failed to register commands for ${guildName}:`,
            error?.message || error
          );
        }
      }
    });

    if (successCount === 0 && failCount === guilds.length) {
      logger.error(
        "Commands",
        `❌ ALL ${guilds.length} servers failed! Check rate limits or API status.`
      );
    } else {
      logger.success(
        "Commands",
        `Registered commands for ${successCount} servers${
          failCount > 0 ? `, ${failCount} failed` : ""
        }${rateLimitedCount > 0 ? ` (${rateLimitedCount} rate limited)` : ""}`
      );
    }

    // Warn if rate limited
    if (rateLimitedCount > 0) {
      logger.warn(
        "Commands",
        `⚠️ ${rateLimitedCount} server(s) hit rate limits during registration. Commands will be registered automatically when limits reset.`
      );
    }
  } catch (error) {
    logger.error("❌ Error registering commands:", error);

    // Check if it's a rate limit error
    if (
      error.code === 429 ||
      error.status === 429 ||
      error.message?.includes("rate limit")
    ) {
      const retryAfter = error.retryAfter || error.retry_after || 1;
      logger.error(
        "Commands",
        `⚠️ RATE LIMITED during registration! Waiting ${retryAfter}s before retry...`
      );
      logger.error(
        "Commands",
        `📊 Rate limit headers: ${JSON.stringify(error.request?.response?.headers || {})}`
      );
    }
  }

  // Check rate limit status after registration
  try {
    const rateLimitHandler = require("./rateLimitHandler");
    const rateLimitStats = rateLimitHandler.getStats();
    const isRateLimited = rateLimitHandler.isRateLimited();

    if (isRateLimited.limited) {
      const resetIn = Math.ceil(isRateLimited.resetIn / 1000);
      logger.warn(
        "Commands",
        `⏳ Currently rate limited! ${isRateLimited.global ? "Global" : "Endpoint"} limit - Resets in ${resetIn}s`
      );
    } else if (rateLimitStats.rateLimitHits > 0) {
      logger.info(
        "Commands",
        `📊 Rate limit status: ${rateLimitStats.rateLimitHitRate} hit rate (${rateLimitStats.rateLimitHits} hits / ${rateLimitStats.totalRequests} requests)`
      );
    } else {
      logger.success("Commands", "✅ No rate limits encountered");
    }
  } catch (err) {
    // Rate limit handler might not be initialized yet
  }
}

module.exports = { registerCommands };

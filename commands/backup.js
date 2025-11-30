const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const db = require("../utils/database");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("backup")
    .setDescription("Backup server configuration and data")
    .addSubcommand((subcommand) =>
      subcommand.setName("create").setDescription("Create a backup")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("restore")
        .setDescription("Restore from backup")
        .addStringOption((option) =>
          option
            .setName("backup_id")
            .setDescription("Backup ID to restore")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("List all backups")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "create") {
      await interaction.deferReply();

      // Backup server config
      const config = await db.getServerConfig(interaction.guild.id);
      const modLogs = await db.getModLogs(interaction.guild.id, null, 1000);
      const warnings = await new Promise((resolve, reject) => {
        db.db.all(
          "SELECT * FROM warnings WHERE guild_id = ?",
          [interaction.guild.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
      const automodRules = await new Promise((resolve, reject) => {
        db.db.all(
          "SELECT * FROM automod_rules WHERE guild_id = ?",
          [interaction.guild.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      const backup = {
        guild_id: interaction.guild.id,
        timestamp: Date.now(),
        config,
        modLogs,
        warnings,
        automodRules,
        channels: interaction.guild.channels.cache.size,
        members: interaction.guild.memberCount,
        roles: interaction.guild.roles.cache.size,
      };

      const backupDir = path.join(__dirname, "..", "backups");
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const backupId = `backup_${interaction.guild.id}_${Date.now()}`;
      const backupPath = path.join(backupDir, `${backupId}.json`);

      fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

      // Save backup record
      await new Promise((resolve, reject) => {
        db.db.run(
          "INSERT INTO backups (guild_id, backup_id, file_path, created_at) VALUES (?, ?, ?, ?)",
          [interaction.guild.id, backupId, backupPath, Date.now()],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      await interaction.editReply({
        embeds: [
          {
            title: "✅ Backup Created",
            description: `Backup ID: \`${backupId}\`\n**Included:**\n- Server Configuration\n- ${modLogs.length} Moderation Logs\n- ${warnings.length} Warnings\n- ${automodRules.length} Auto-Mod Rules`,
            color: 0x00ff00,
            timestamp: new Date().toISOString(),
          },
        ],
      });
    } else if (subcommand === "list") {
      const backups = await new Promise((resolve, reject) => {
        db.db.all(
          "SELECT * FROM backups WHERE guild_id = ? ORDER BY created_at DESC LIMIT 10",
          [interaction.guild.id],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      if (backups.length === 0) {
        return interaction.reply({
          content: "❌ No backups found!",
          ephemeral: true,
        });
      }

      const list = backups
        .map(
          (b) => `\`${b.backup_id}\` - <t:${Math.floor(b.created_at / 1000)}:R>`
        )
        .join("\n");

      const embed = new EmbedBuilder()
        .setTitle("📦 Backups")
        .setDescription(list)
        .setColor(0x0099ff)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === "restore") {
      const backupId = interaction.options.getString("backup_id");

      const backupRecord = await new Promise((resolve, reject) => {
        db.db.get(
          "SELECT * FROM backups WHERE guild_id = ? AND backup_id = ?",
          [interaction.guild.id, backupId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!backupRecord) {
        return interaction.reply({
          content: "❌ Backup not found!",
          ephemeral: true,
        });
      }

      const backupData = JSON.parse(
        fs.readFileSync(backupRecord.file_path, "utf8")
      );

      // Restore config
      if (backupData.config) {
        await db.setServerConfig(interaction.guild.id, backupData.config);
      }

      await interaction.reply({
        embeds: [
          {
            title: "✅ Backup Restored",
            description: `Restored backup: \`${backupId}\``,
            color: 0x00ff00,
          },
        ],
      });
    }
  },
};

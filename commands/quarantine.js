const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quarantine")
    .setDescription("Manage member quarantine")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Add a member to quarantine")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to quarantine")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("reason")
            .setDescription("Reason for quarantine")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription(
          "Remove a member from quarantine and restore their roles"
        )
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("User to remove from quarantine")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "add") {
      const user = interaction.options.getUser("user");
      const reason =
        interaction.options.getString("reason") || "No reason provided";

      // Safety checks
      if (user.id === interaction.user.id) {
        return interaction.reply({
          content: "❌ You cannot quarantine yourself!",
          ephemeral: true,
        });
      }

      if (user.id === interaction.client.user.id) {
        return interaction.reply({
          content: "❌ I cannot quarantine myself!",
          ephemeral: true,
        });
      }

      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (!member) {
        return interaction.reply({
          content: "❌ User not found in this server!",
          ephemeral: true,
        });
      }

      // Check if moderator is server owner (owners can quarantine anyone)
      const isOwner = interaction.member.id === interaction.guild.ownerId;
      
      // Check role hierarchy (unless moderator is owner)
      if (!isOwner && member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({
          content: "❌ You cannot quarantine someone with equal or higher roles!",
          ephemeral: true,
        });
      }

      // Get or create quarantine role
      let quarantineRole = interaction.guild.roles.cache.find((r) =>
        r.name.toLowerCase().includes("quarantine")
      );

      if (!quarantineRole) {
        quarantineRole = await interaction.guild.roles.create({
          name: "Quarantine",
          color: 0xff0000,
          reason: "Quarantine system",
          permissions: [],
        });
      }

      // Store original roles
      const originalRoles = member.roles.cache
        .filter((r) => r.id !== interaction.guild.id)
        .map((r) => r.id);

      await new Promise((resolve, reject) => {
        db.db.run(
          "INSERT OR REPLACE INTO quarantine (guild_id, user_id, original_roles, reason, quarantined_by, quarantined_at) VALUES (?, ?, ?, ?, ?, ?)",
          [
            interaction.guild.id,
            user.id,
            JSON.stringify(originalRoles),
            reason,
            interaction.user.id,
            Date.now(),
          ],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Remove all roles and add quarantine role
      await member.roles.set([quarantineRole.id], reason);

      const embed = new EmbedBuilder()
        .setTitle("✅ Member Quarantined")
        .setDescription(`${user.tag} has been quarantined.`)
        .addFields(
          { name: "User", value: `${user.tag} (${user.id})`, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setColor(0xff0000)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } else if (subcommand === "remove") {
      const user = interaction.options.getUser("user");

      const quarantineData = await new Promise((resolve, reject) => {
        db.db.get(
          "SELECT * FROM quarantine WHERE guild_id = ? AND user_id = ?",
          [interaction.guild.id, user.id],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      if (!quarantineData) {
        return interaction.reply({
          content: "❌ User is not in quarantine!",
          ephemeral: true,
        });
      }

      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (member) {
        // Restore original roles
        const originalRoles = JSON.parse(quarantineData.original_roles || "[]");
        const rolesToAdd = originalRoles.filter((roleId) =>
          interaction.guild.roles.cache.has(roleId)
        );

        // Remove quarantine role
        const quarantineRole = interaction.guild.roles.cache.find((r) =>
          r.name.toLowerCase().includes("quarantine")
        );
        if (quarantineRole) {
          await member.roles.remove(quarantineRole);
        }

        // Restore original roles
        if (rolesToAdd.length > 0) {
          await member.roles.add(rolesToAdd);
        }
      }

      // Remove from database
      await new Promise((resolve, reject) => {
        db.db.run(
          "DELETE FROM quarantine WHERE guild_id = ? AND user_id = ?",
          [interaction.guild.id, user.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Member Removed from Quarantine")
        .setDescription(
          `${user.tag} has been removed from quarantine and their roles have been restored.`
        )
        .setColor(0x00ff00)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    }
  },
};

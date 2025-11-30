const { registerCommands } = require("../utils/registerCommands");

module.exports = {
  name: "guildCreate",
  async execute(guild, client) {
    console.log(`🆕 Joined new server: ${guild.name} (${guild.id})`);

    // Register commands for the new server
    try {
      const commands = [];
      const fs = require("fs");
      const path = require("path");
      const commandsPath = path.join(__dirname, "..", "commands");
      const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));

      for (const file of commandFiles) {
        const command = require(`../commands/${file}`);
        if (command.data) {
          commands.push(command.data.toJSON());
        }
      }

      const { REST, Routes } = require("discord.js");
      const rest = new REST({ version: "10" }).setToken(
        process.env.DISCORD_TOKEN
      );

      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guild.id),
        { body: commands }
      );

      console.log(
        `✅ Registered ${commands.length} commands for ${guild.name}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to register commands for ${guild.name}:`,
        error.message
      );
    }
  },
};

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Performance = require("../utils/performance");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("performance")
    .setDescription("Check bot performance metrics"),
  
  async execute(interaction) {
    const metrics = Performance.getMetrics();
    const memoryMB = {
      rss: (metrics.memory.rss / 1024 / 1024).toFixed(2),
      heapUsed: (metrics.memory.heapUsed / 1024 / 1024).toFixed(2),
      heapTotal: (metrics.memory.heapTotal / 1024 / 1024).toFixed(2),
    };
    
    const uptimeHours = (metrics.uptime / 3600).toFixed(2);
    
    const embed = new EmbedBuilder()
      .setTitle("⚡ Performance Metrics")
      .addFields(
        { name: "Uptime", value: `${uptimeHours} hours`, inline: true },
        { name: "Memory (RSS)", value: `${memoryMB.rss} MB`, inline: true },
        { name: "Heap Used", value: `${memoryMB.heapUsed} MB`, inline: true },
        { name: "Active Operations", value: `${metrics.activeOperations}`, inline: true }
      )
      .setColor(0x00ff00)
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
};


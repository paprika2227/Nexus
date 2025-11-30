const db = require("../utils/database");

module.exports = {
  name: "guildMemberRemove",
  async execute(member, client) {
    const config = await db.getServerConfig(member.guild.id);

    // Send leave message if configured
    if (config && config.leave_channel && config.leave_message) {
      const leaveChannel = member.guild.channels.cache.get(
        config.leave_channel
      );
      if (leaveChannel) {
        const message = config.leave_message
          .replace(/{user}/g, member.user.tag)
          .replace(/{server}/g, member.guild.name);

        leaveChannel
          .send({
            embeds: [
              {
                title: "👋 Member Left",
                description: message,
                color: 0xff0000,
              },
            ],
          })
          .catch(() => {});
      }
    }

    // Log analytics
    await db.logAnalytics(member.guild.id, "member_leave", {
      user_id: member.id,
    });
  },
};

const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { replyEmbed, sendEmbed } = require("../customSend.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("endsession")
    .setDescription("[ADMIN] Start a voice session with another user.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {

    if (interaction.channel.name.endsWith("(private)")) {
      await replyEmbed(interaction, {
        path: "requestAcquired",
        ephemeral: true,
      });

      const members = await interaction.channel.members;

      for (const member of members) {
        await sendEmbed(member, {
          path: "voiceSession.end",
          values: {
            channelName: interaction.channel.name,
          },
        });
      }

      await interaction.channel
        .delete("End private session.")
        .catch(console.error);
    } else {
      await replyEmbed(interaction, {
        path: "voiceSession.notSession",
        ephemeral: true,
      });
    }
  },
};

require("dotenv").config();
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { replyEmbed, sendEmbed } = require("../customSend.js");
const { findChannelByID } = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("available")
    .setDescription(
      "Ask if there are any available linguists from a certain language pool."
    )
    .addRoleOption((option) =>
      option.setName("language").setDescription("A language").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
  async execute(interaction) {
    const role = interaction.options.getRole("language");

    await replyEmbed(interaction, { path: "requestAcquired", ephemeral: true });

    await sendEmbed(
      findChannelByID(interaction, process.env.GLOBALLINGSUPPORTCHANNELID),
      {
        path: "available.asking",
        values: {
          user: interaction.user.id,
          role: role.id,
        },
        content: role.toString(),
      }
    );
  },
};

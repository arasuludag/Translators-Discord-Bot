require("dotenv").config();
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { replyEmbed } = require("../customSend.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kickfromthread")
    .setDescription("Kick someone from the thread you use this command on.")
    .addUserOption((option) =>
      option.setName("user").setDescription("Who?").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const user = interaction.options.getUser("user");

    if (!interaction.channel.isThread()) {
      await replyEmbed(interaction, {
        path: "setParentError",
        ephemeral: true,
      });
      return;
    }
    await interaction.channel.members.remove(user.id);

    await replyEmbed(interaction, { path: "requestAcquired", ephemeral: true });
  },
};

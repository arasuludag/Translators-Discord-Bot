require("dotenv").config();
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const functions = require("../functions.js");

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
      await interaction.reply(
        functions.randomSend({ path: "setParentError", ephemeral: true })
      );
      return;
    }
    await interaction.channel.members.remove(user.id);

    await interaction.reply(
      functions.randomSend({ path: "requestAcquired", ephemeral: true })
    );
  },
};
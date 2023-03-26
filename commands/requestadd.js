const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("requestadd")
    .setDescription("This command is moved to /addme manual")
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
  async execute(interaction) {
    await interaction.reply({
      content: "Moved to /addme manual",
      ephemeral: true,
    });
  },
};

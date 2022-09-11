require("dotenv").config();
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("requestadd")
    .setDescription("This command is moved to /addme manual"),
  async execute(interaction) {
    await interaction.reply({
      content: "Moved to /addme manual",
      ephemeral: true,
    });
  },
};

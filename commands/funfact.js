const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("funfact")
    .setDescription("A funfact."),
  async execute(interaction) {
    interaction.reply(`Fun fact! ${functions.randomText("funfacts", {})}`);
  },
};

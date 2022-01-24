const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");
const { suggestionChannelName } = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Make a suggestion to mods.")
    .addStringOption((option) =>
      option
        .setName("suggestion")
        .setDescription("Type your suggestion here.")
        .setRequired(true)
    ),
  async execute(interaction) {
    const suggestionChannel = functions.findChannel(interaction, suggestionChannelName);
    const suggestion = interaction.options.getString("suggestion");

    suggestionChannel.send(
      functions.randomText("suggestion.personSuggests", {
        user: interaction.user.id,
        suggestion: suggestion,
      })
    );

    interaction.reply({
      content: functions.randomText("suggestion.acquired", {}),
      ephemeral: true,
    });
  },
};

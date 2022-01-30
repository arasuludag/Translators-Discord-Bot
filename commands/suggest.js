const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");
const {
  suggestionChannelName,
  langmanagerRole,
  lmSuggestionChannelName,
} = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Make a suggestion to mods.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("language_specific")
        .setDescription("Language specific suggestion")
        .addRoleOption((option) =>
          option
            .setName("language")
            .setDescription("Language")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("suggestion")
            .setDescription("Your suggestion.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("lm_meetings")
        .setDescription("LM Meetings suggestion")
        .addStringOption((option) =>
          option
            .setName("suggestion")
            .setDescription("Your suggestion.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("discord")
        .setDescription("Suggestion about the channel.")
        .addStringOption((option) =>
          option
            .setName("suggestion")
            .setDescription("Your suggestion.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("other")
        .setDescription("Any other suggestions.")
        .addStringOption((option) =>
          option
            .setName("suggestion")
            .setDescription("Your suggestion.")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const suggestionChannel = functions.findChannel(
      interaction,
      suggestionChannelName
    );
    const lmSuggestionChannel = functions.findChannel(
      interaction,
      lmSuggestionChannelName
    );

    const suggestion = interaction.options.getString("suggestion");

    switch (true) {
      case interaction.options.getSubcommand() === "language_specific": {
        const role = interaction.options.getRole("language");
        lmSuggestionChannel.send(
          functions.randomText(
            "suggestion.personSuggests",
            {
              user: interaction.user.id,
              suggestion: role.toString() + " " + suggestion,
            },
            "Language Spesific Suggestion"
          )
        );

        interaction.user.send(
          functions.randomText(
            "suggestion.suggestionRecieved",
            {
              suggestion: suggestion,
            },
            "Language Spesific Suggestion"
          )
        );
        break;
      }

      case interaction.options.getSubcommand() === "lm_meetings": {
        const lm = await interaction.guild.roles.cache.find(
          (r) => r.name === langmanagerRole
        );
        lmSuggestionChannel.send(
          functions.randomText(
            "suggestion.personSuggests",
            {
              user: interaction.user.id,
              suggestion: lm.toString() + " " + suggestion,
            },
            "LM Meeting Suggestion"
          )
        );

        interaction.user.send(
          functions.randomText(
            "suggestion.suggestionRecieved",
            {
              suggestion: suggestion,
            },
            "LM Meeting Suggestion"
          )
        );
        break;
      }

      case interaction.options.getSubcommand() === "discord":
        suggestionChannel.send(
          functions.randomText(
            "suggestion.personSuggests",
            {
              user: interaction.user.id,
              suggestion: suggestion,
            },
            "Discord Suggestion"
          )
        );

        interaction.user.send(
          functions.randomText(
            "suggestion.suggestionRecieved",
            {
              suggestion: suggestion,
            },
            "Discord Suggestion"
          )
        );
        break;

      case interaction.options.getSubcommand() === "other":
        suggestionChannel.send(
          functions.randomText(
            "suggestion.personSuggests",
            {
              user: interaction.user.id,
              suggestion: suggestion,
            },
            "Other Suggestion"
          )
        );

        interaction.user.send(
          functions.randomText(
            "suggestion.suggestionRecieved",
            {
              suggestion: suggestion,
            },
            "Other Suggestion"
          )
        );
        break;

      default:
        break;
    }

    interaction.reply({
      content: functions.randomEphemeralText("suggestion.acquired", {}),
      ephemeral: true,
    });
  },
};

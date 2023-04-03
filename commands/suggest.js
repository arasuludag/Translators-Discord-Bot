const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { sendEmbed, replyEmbed } = require("../customSend.js");
const { findChannel } = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Make a suggestion to admins.")
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
        .setName("other")
        .setDescription("Any other suggestions.")
        .addStringOption((option) =>
          option
            .setName("suggestion")
            .setDescription("Your suggestion.")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
  async execute(interaction) {
    const suggestionChannel = findChannel(
      interaction,
      process.env.SUGGESTIONCHANNELNAME
    );
    const lmSuggestionChannel = findChannel(
      interaction,
      process.env.LMSUGGESTIONCHANNELNAME
    );

    const suggestion = interaction.options.getString("suggestion");

    switch (true) {
      case interaction.options.getSubcommand() === "language_specific": {
        const role = interaction.options.getRole("language");
        sendEmbed(lmSuggestionChannel, {
          path: "suggestion.personSuggests",
          values: {
            user: interaction.user.id,
            suggestion: role.toString() + " " + suggestion,
          },
          title: "Language Specific Suggestion",
          content: role.toString(),
        });

        sendEmbed(interaction.user, {
          path: "suggestion.suggestionReceived",
          values: {
            suggestion: suggestion,
          },
          title: "Language Specific Suggestion",
        });
        break;
      }

      case interaction.options.getSubcommand() === "other":
        sendEmbed(suggestionChannel, {
          path: "suggestion.personSuggests",
          values: {
            user: interaction.user.id,
            suggestion: suggestion,
          },
          title: "Other Suggestion",
        });

        sendEmbed(interaction.user, {
          path: "suggestion.suggestionReceived",
          values: {
            suggestion: suggestion,
          },
          title: "Other Suggestion",
        });
        break;

      default:
        break;
    }

    await replyEmbed(interaction, {
      path: "suggestion.acquired",
      ephemeral: true,
    });
  },
};

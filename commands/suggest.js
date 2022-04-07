const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");

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
      process.env.SUGGESTIONCHANNELNAME
    );
    const lmSuggestionChannel = functions.findChannel(
      interaction,
      process.env.LMSUGGESTIONCHANNELNAME
    );

    const suggestion = interaction.options.getString("suggestion");

    switch (true) {
      case interaction.options.getSubcommand() === "language_specific": {
        const role = interaction.options.getRole("language");
        lmSuggestionChannel.send(
          functions.randomSend({
            path: "suggestion.personSuggests",
            values: {
              user: interaction.user.id,
              suggestion: role.toString() + " " + suggestion,
            },
            title: "Language Spesific Suggestion",
            content: role.toString(),
          })
        );

        interaction.user
          .send(
            functions.randomSend({
              path: "suggestion.suggestionReceived",
              values: {
                suggestion: suggestion,
              },
              title: "Language Spesific Suggestion",
            })
          )
          .catch(() => {
            console.error("Failed to send DM");
          });
        break;
      }

      case interaction.options.getSubcommand() === "lm_meetings": {
        const lm = await interaction.guild.roles.cache.find(
          (r) => r.name === process.env.LANGMANAGERROLE
        );
        lmSuggestionChannel.send(
          functions.randomSend({
            path: "suggestion.personSuggests",
            values: {
              user: interaction.user.id,
              suggestion: lm.toString() + " " + suggestion,
            },
            title: "LM Meeting Suggestion",
            content: lm.toString(),
          })
        );

        interaction.user
          .send(
            functions.randomSend({
              path: "suggestion.suggestionReceived",
              values: {
                suggestion: suggestion,
              },
              title: "LM Meeting Suggestion",
            })
          )
          .catch(() => {
            console.error("Failed to send DM");
          });
        break;
      }

      case interaction.options.getSubcommand() === "discord":
        suggestionChannel.send(
          functions.randomSend({
            path: "suggestion.personSuggests",
            values: {
              user: interaction.user.id,
              suggestion: suggestion,
            },
            title: "Discord Suggestion",
          })
        );

        interaction.user
          .send(
            functions.randomSend({
              path: "suggestion.suggestionReceived",
              values: {
                suggestion: suggestion,
              },
              title: "Discord Suggestion",
            })
          )
          .catch(() => {
            console.error("Failed to send DM");
          });
        break;

      case interaction.options.getSubcommand() === "other":
        suggestionChannel.send(
          functions.randomSend({
            path: "suggestion.personSuggests",
            values: {
              user: interaction.user.id,
              suggestion: suggestion,
            },
            title: "Other Suggestion",
          })
        );

        interaction.user
          .send(
            functions.randomSend({
              path: "suggestion.suggestionReceived",
              values: {
                suggestion: suggestion,
              },
              title: "Other Suggestion",
            })
          )
          .catch(() => {
            console.error("Failed to send DM");
          });
        break;

      default:
        break;
    }

    await interaction.reply(
      functions.randomSend({ path: "suggestion.acquired", ephemeral: true })
    );
  },
};

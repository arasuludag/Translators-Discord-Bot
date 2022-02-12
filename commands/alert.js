const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");
const { sassAlertChannelID, suppAlertChannelID } = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("alert")
    .setDescription("Post in alert channels.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("longform")
        .setDescription("Longform alert.")
        .addStringOption((option) =>
          option
            .setName("alert_text")
            .setDescription("The alert.")
            .setRequired(true)
        )
        .addBooleanOption((option) =>
          option
            .setName("template")
            .setDescription("Is this a template QC you've submitted?")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("supplemental")
        .setDescription("Supplemental alert.")
        .addStringOption((option) =>
          option
            .setName("alert_text")
            .setDescription("The alert.")
            .setRequired(true)
        )
        .addBooleanOption((option) =>
          option
            .setName("template")
            .setDescription("Is this a template QC you've submitted?")
        )
    ),
  async execute(interaction) {
    const alertText = await interaction.options.getString("alert_text");

    switch (true) {
      case interaction.options.getSubcommand() === "longform": {
        const sassAlertChannel = functions.findChannelByID(
          interaction,
          sassAlertChannelID
        );
        if (interaction.options.getBoolean("template")) {
          sassAlertChannel.send(
            functions.randomText(
              "alert.messageTemplate",
              {
                user: interaction.user.id,
                context: alertText,
              },
              "🚨 Alert - TEMPLATE QC!"
            )
          );
          break;
        }
        sassAlertChannel.send(
          functions.randomText(
            "alert.message",
            {
              user: interaction.user.id,
              context: alertText,
            },
            "🚨 Alert!"
          )
        );
        break;
      }

      case interaction.options.getSubcommand() === "supplemental": {
        const supplementalAlertChannel = functions.findChannelByID(
          interaction,
          suppAlertChannelID
        );
        if (interaction.options.getBoolean("template")) {
          supplementalAlertChannel.send(
            functions.randomText(
              "alert.messageTemplate",
              {
                user: interaction.user.id,
                context: alertText,
              },
              "🚨 Alert - TEMPLATE QC!"
            )
          );
          break;
        }
        supplementalAlertChannel.send(
          functions.randomText(
            "alert.message",
            {
              user: interaction.user.id,
              context: alertText,
            },
            "🚨 Alert!"
          )
        );
        break;
      }
    }

    interaction.reply({
      content: functions.randomEphemeralText("requestAcquired", {}),
      ephemeral: true,
    });
  },
};

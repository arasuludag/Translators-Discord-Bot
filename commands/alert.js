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
    ),
  async execute(interaction) {
    const alertText = await interaction.options.getString("alert_text");

    switch (true) {
      case interaction.options.getSubcommand() === "longform":
        const sassAlertChannel = functions.findChannelByID(
          interaction,
          sassAlertChannelID
        );
        sassAlertChannel.send(
          functions.randomText(
            "alert.message",
            {
              user: interaction.user.id,
              context: alertText,
            },
            `🚨 Alert!`
          )
        );
        break;

      case interaction.options.getSubcommand() === "supplemental":
        const supplementalAlertChannel = functions.findChannelByID(
          interaction,
          suppAlertChannelID
        );
        supplementalAlertChannel.send(
          functions.randomText(
            "alert.message",
            {
              user: interaction.user.id,
              context: alertText,
            },
            `🚨 Alert!`
          )
        );
        break;
    }

    interaction.reply({
      content: functions.randomEphemeralText("requestAcquired", {}),
      ephemeral: true,
    });
  },
};

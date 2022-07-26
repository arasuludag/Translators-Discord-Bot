require("dotenv").config();
const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");

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
    let languageRole = "their target language";
    for (const [id, role] of interaction.member.roles.cache) {
      if (role.icon) {
        languageRole = `<@&${id}>`;
        break;
      }
    }

    const alertText = await interaction.options.getString("alert_text");

    switch (true) {
      case interaction.options.getSubcommand() === "longform": {
        const sassAlertChannel = functions.findChannelByID(
          interaction,
          process.env.SASSALERTCHANNELID
        );
        if (interaction.options.getBoolean("template")) {
          sassAlertChannel.send(
            functions.randomSend({
              path: "alert.messageTemplate",
              values: {
                user: interaction.user.id,
                context: alertText,
              },
              title: "🚨 Alert - TEMPLATE QC!",
            })
          );
          break;
        }

        await sassAlertChannel.send(
          functions.randomSend({
            path: "alert.message",
            values: {
              user: interaction.user.id,
              role: languageRole,
              context: alertText,
            },
            title: "🚨 Alert!",
          })
        );
        break;
      }

      case interaction.options.getSubcommand() === "supplemental": {
        const supplementalAlertChannel = functions.findChannelByID(
          interaction,
          process.env.SUPPALERTCHANNELID
        );
        if (interaction.options.getBoolean("template")) {
          supplementalAlertChannel.send(
            functions.randomSend({
              path: "alert.messageTemplate",
              values: {
                user: interaction.user.id,
                context: alertText,
              },
              title: "🚨 Alert - TEMPLATE QC!",
            })
          );
          break;
        }
        await supplementalAlertChannel.send(
          functions.randomSend({
            path: "alert.message",
            values: {
              user: interaction.user.id,
              role: languageRole,
              context: alertText,
            },
            title: "🚨 Alert!",
          })
        );
        break;
      }
    }

    interaction.reply(
      functions.randomSend({ path: "requestAcquired", ephemeral: true })
    );
  },
};

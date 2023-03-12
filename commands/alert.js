const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { sendEmbed, replyEmbed } = require("../customSend.js");
const { findChannelByID } = require("../functions.js");

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
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
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
        const sassAlertChannel = findChannelByID(
          interaction,
          process.env.SASSALERTCHANNELID
        );
        if (interaction.options.getBoolean("template")) {
          sendEmbed(sassAlertChannel, {
            path: "alert.messageTemplate",
            values: {
              user: interaction.user.id,
              context: alertText,
            },
            title: "🚨 Alert - TEMPLATE QC!",
          });
          break;
        }

        await sendEmbed(sassAlertChannel, {
          path: "alert.message",
          values: {
            user: interaction.user.id,
            role: languageRole,
            context: alertText,
          },
          title: "🚨 Alert!",
        });
        break;
      }

      case interaction.options.getSubcommand() === "supplemental": {
        const supplementalAlertChannel = findChannelByID(
          interaction,
          process.env.SUPPALERTCHANNELID
        );
        if (interaction.options.getBoolean("template")) {
          sendEmbed(supplementalAlertChannel, {
            path: "alert.messageTemplate",
            values: {
              user: interaction.user.id,
              context: alertText,
            },
            title: "🚨 Alert - TEMPLATE QC!",
          });
          break;
        }
        await sendEmbed(supplementalAlertChannel, {
          path: "alert.message",
          values: {
            user: interaction.user.id,
            role: languageRole,
            context: alertText,
          },
          title: "🚨 Alert!",
        });
        break;
      }
    }

    replyEmbed(interaction, { path: "requestAcquired", ephemeral: true });
  },
};

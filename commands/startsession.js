const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { replyEmbed, sendEmbed } = require("../customSend.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("startsession")
    .setDescription("[ADMIN] Start a voice session with another user.")
    .addStringOption((option) =>
      option
        .setName("channel_name")
        .setDescription("What should it be called?")
        .setRequired(true)
    )
    .addUserOption((option) =>
      option.setName("user").setDescription("To whom?").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("date")
        .setDescription("Ex. 01 Jan 2022 20:20 GMT or UTC+3 etc.")
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const user = interaction.options.getUser("user");
    const channelName = interaction.options.getString("channel_name");
    const date = interaction.options.getString("date");
    const unixTimeWhen = Date.parse(date);

    let differenceBetween = 0;
    if (date) {
      if (isNaN(unixTimeWhen)) {
        return replyEmbed(interaction, {
          path: "reminder.notADate",
          ephemeral: true,
        });
      }

      differenceBetween = unixTimeWhen - Date.now();
      if (differenceBetween < 0) {
        return replyEmbed(interaction, {
          path: "reminder.enteredPastDate",
          ephemeral: true,
        });
      }

      await sendEmbed(user, {
        path: "voiceSession.willStartAt",
        values: {
          establisher: interaction.user.id,
          user: user.id,
          channel: channelName,
          time: `<t:${unixTimeWhen / 1000}> (<t:${unixTimeWhen / 1000}:R>)`
        },
      });

      await sendEmbed(interaction.user, {
        path: "voiceSession.willStartAt",
        values: {
          establisher: interaction.user.id,
          user: user.id,
          channel: channelName,
          time: `<t:${unixTimeWhen / 1000}> (<t:${unixTimeWhen / 1000}:R>)`
        },
      });
    }

    await replyEmbed(interaction, { path: "requestAcquired", ephemeral: true });

    setTimeout(
      () =>
        interaction.guild.channels
          .create({
            name: `${channelName} (private)`,
            type: 2,
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: user.id,
                allow: [PermissionFlagsBits.ViewChannel],
              },
            ],
          })
          .then(async (createdChannel) => {
            await sendEmbed(user, {
              path: "voiceSession.start",
              values: {
                establisher: interaction.user.id,
                user: user.id,
                channel: createdChannel.id,
              },
            });

            await sendEmbed(interaction.user, {
              path: "voiceSession.start",
              values: {
                establisher: interaction.user.id,
                user: user.id,
                channel: createdChannel.id,
              },
            });
          }),
      differenceBetween
    );
  },
};

require("dotenv").config();
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { replyEmbed, sendEmbed } = require("../customSend.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remindme")
    .setDescription("Set a reminder.")
    .addStringOption((option) =>
      option
        .setName("for_what")
        .setDescription("What am I reminding?")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("date")
        .setDescription("Ex. 01 Jan 2022 20:20 GMT or UTC+3 etc.")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("remind_before")
        .setDescription(
          "How long before the event do you want to be reminded (In minutes) (Ex. 20)"
        )
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Which channel?")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const mentionedChannel = interaction.options.getChannel("channel");
    const remindText = interaction.options.getString("for_what");
    const unixTimeWhen = Date.parse(interaction.options.getString("date"));
    const remindBefore = interaction.options.getInteger("remind_before");

    if (isNaN(unixTimeWhen)) {
      return replyEmbed(interaction, {
        path: "reminder.notADate",
        ephemeral: true,
      });
    }

    const differenceBetween = unixTimeWhen - Date.now();
    if (differenceBetween < 0) {
      return replyEmbed(interaction, {
        path: "reminder.enteredPastDate",
        ephemeral: true,
      });
    }

    await replyEmbed(interaction, { path: "requestAcquired", ephemeral: true });

    let timeLeftTimeout = [];
    let timeCameTimeout = [];

    const reminderMessage = await sendEmbed(mentionedChannel, {
      path: "reminder.initiated",
      values: {
        event: remindText,
        time: `<t:${unixTimeWhen / 1000}> (<t:${unixTimeWhen / 1000}:R>)`,
        before: remindBefore,
      },
      content: "@everyone",
    });

    timeLeftTimeout[0] = setTimeout(
      () =>
        sendEmbed(mentionedChannel, {
          path: "reminder.minutesLeft",
          values: {
            minutesBefore: remindBefore,
            remindText: remindText,
          },
          content: "@everyone",
        }),
      differenceBetween - remindBefore * 60 * 1000
    );
    timeCameTimeout[1] = setTimeout(
      () =>
        sendEmbed(mentionedChannel, {
          path: "reminder.itsTime",
          values: {
            remindText: remindText,
          },
          content: "@everyone",
        }),
      differenceBetween
    );

    const filter = (reaction, user) =>
      reaction.emoji.name === "❌" &&
      !user.bot &&
      interaction.member.roles.cache.some(
        (role) => role.id === process.env.MODROLEID
      );

    const collector = reminderMessage.createReactionCollector({
      filter,
      time: differenceBetween,
      max: 1,
    });

    collector.on("collect", async () => {
      reminderMessage.react("❌");

      clearTimeout(timeLeftTimeout[0]);
      clearTimeout(timeCameTimeout[1]);

      await sendEmbed(mentionedChannel, {
        path: "reminder.canceled",
        values: {
          event: remindText,
        },
      });
    });
  },
};

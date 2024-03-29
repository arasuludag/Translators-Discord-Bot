const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const { ButtonBuilder, ActionRowBuilder } = require("discord.js");
const { replyEmbed, sendEmbed } = require("../customSend.js");
const {
  findCategoryByName,
  findChannelByID,
  findChannel,
} = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("requestarchive")
    .setDescription("Ask the admins to archive this channel.")
    .addStringOption((option) =>
      option.setName("reason").setDescription("Why?").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
  async execute(interaction) {
    const reasonText = interaction.options.getString("reason");

    if (
      !interaction.channel.type === ChannelType.GuildText ||
      interaction.channel.isThread()
    )
      return await replyEmbed(interaction, {
        path: "setParentError",
        ephemeral: true,
      });

    await replyEmbed(interaction, {
      path: "requestAcquired",
      ephemeral: true,
    });

    const approvalChannel = await findChannel(
      interaction,
      process.env.AWAITINGAPPROVALSCHANNELNAME
    );
    const logsChannel = await findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    await sendEmbed(logsChannel, {
      path: "requestedArchive",
      values: {
        user: interaction.user.id,
        channel: interaction.channel.id,
        reason: reasonText,
      },
    });

    const acceptButtonCustomID = "Accept " + interaction.id;
    const rejectButtonCustomID = "Reject " + interaction.id;

    const acceptButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(acceptButtonCustomID)
        .setLabel("Approve")
        .setStyle("Success")
    );
    const rejectButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(rejectButtonCustomID)
        .setLabel("Reject")
        .setStyle("Danger")
    );

    await sendEmbed(approvalChannel, {
      path: "requestedArchive",
      values: {
        user: interaction.user.id,
        channel: interaction.channel.id,
        reason: reasonText,
      },
      components: [acceptButton, rejectButton],
    }).then((replyMessage) => {
      const filter = (i) => interaction.id === i.customId.split(" ")[1];

      const collector = replyMessage.channel.createMessageComponentCollector({
        filter,
        max: 1,
      });

      collector.on("collect", async (i) => {
        if (i.customId === acceptButtonCustomID) {
          if (interaction.channel.isThread()) {
            await sendEmbed(i.user, "setParentError");
            return;
          }

          for await (let i of Array.from(Array(100).keys())) {
            const category = findCategoryByName(
              interaction,
              `${process.env.ARCHIVECATEGORY} ${i}🗑`
            );
            if (!category) continue;

            const isOkay = await interaction.channel
              .setParent(category.id, { lockPermissions: false })
              .then(() => {
                return true;
              })
              .catch(() => {
                return false;
              });

            if (isOkay) break;
          }

          await sendEmbed(interaction.channel, {
            path: "movedToWO_User",
            values: {
              channel: interaction.channel.id,
            },
          });

          await sendEmbed(logsChannel, {
            path: "movedToArchive",
            values: {
              user: i.user.id,
              channel: interaction.channel.id,
            },
          });
        } else {
          await sendEmbed(logsChannel, {
            path: "notMovedToArchive",
            values: {
              user: i.user.id,
              channel: interaction.channel.id,
              requestedUser: interaction.user.id,
            },
          });
        }

        await i.message.delete();
      });
    });
  },
};

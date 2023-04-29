const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const { ButtonBuilder, ActionRowBuilder } = require("discord.js");
const { replyEmbed, sendEmbed } = require("../customSend.js");
const {
  findCategoryByName,
  findChannel,
  findChannelByID,
} = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("requestunarchive")
    .setDescription("Ask the admins to unarchive this channel.")
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

    await replyEmbed(interaction, { path: "requestAcquired", ephemeral: true });

    const approvalChannel = await findChannel(
      interaction,
      process.env.AWAITINGAPPROVALSCHANNELNAME
    );
    const logsChannel = await findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    await sendEmbed(logsChannel, {
      path: "requestedUnArchive",
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
      path: "requestedUnArchive",
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

          const category = findCategoryByName(
            interaction,
            process.env.PROJECTSCATEGORY
          );

          interaction.channel
            .setParent(category.id, { lockPermissions: false })
            .catch((error) => {
              logsChannel.send(
                "Error: Setting the category of channel. \n " + error
              );
            });

          await sendEmbed(interaction.channel, {
            path: "movedFromWO_User",
            values: {
              channel: interaction.channel.id,
            },
          });

          await sendEmbed(logsChannel, {
            path: "movedFromArchive",
            values: {
              user: i.user.id,
              channel: interaction.channel.id,
            },
          });
        } else {
          await sendEmbed(logsChannel, {
            path: "notMovedFromArchive",
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

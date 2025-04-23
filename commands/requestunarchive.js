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

    // Check if channel is in ARCHIVECATEGORY
    if (!interaction.channel.parent || !interaction.channel.parent.name.includes(process.env.ARCHIVECATEGORY)) {
      return await replyEmbed(interaction, {
        path: "archive.invalidChannel",
        values: {
          category: process.env.ARCHIVECATEGORY
        },
        ephemeral: true,
      });
    }

    if (
      !interaction.channel.type === ChannelType.GuildText ||
      interaction.channel.isThread()
    )
      return await replyEmbed(interaction, {
        path: "setParentError",
        ephemeral: true,
      });

    await replyEmbed(interaction, { path: "requestAcquired", ephemeral: true });

    const logsChannel = await findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    const yesButtonCustomID = "UnarchiveYes " + interaction.id;
    const noButtonCustomID = "UnarchiveNo " + interaction.id;

    const yesButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(yesButtonCustomID)
        .setLabel("Yes")
        .setStyle("Success")
    );
    const noButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(noButtonCustomID)
        .setLabel("No")
        .setStyle("Danger")
    );

    // Initial vote count
    const yesVotes = new Set();
    const requiredVotes = 2;
    const requestCreatorId = interaction.user.id;

    // Send initial message with vote count
    const questionMessage = await sendEmbed(interaction.channel, {
      path: "archive.unarchiveQuestion",
      values: {
        reason: reasonText,
        votes: 0,
        required: requiredVotes
      },
      components: [yesButton, noButton],
    });

    const filter = (i) => interaction.id === i.customId.split(" ")[1];

    const collector = questionMessage.createMessageComponentCollector({
      filter,
      time: 24 * 60 * 60 * 1000, // 24 hours
    });

    collector.on("collect", async (i) => {
      // Don't allow the request creator to vote
      if (i.user.id === requestCreatorId) {
        await i.reply({ 
          content: "You cannot vote on your own unarchive request.", 
          ephemeral: true 
        });
        return;
      }

      await i.deferUpdate();

      if (i.customId === yesButtonCustomID) {
        yesVotes.add(i.user.id);
      } else if (i.customId === noButtonCustomID) {
        yesVotes.delete(i.user.id);
      }

      // Update the message with the new vote count
      await questionMessage.edit({
        embeds: [{
          description: questionMessage.embeds[0].description.replace(
            /Current votes: \d+\/\d+/,
            `Current votes: ${yesVotes.size}/${requiredVotes}`
          )
        }],
        components: [yesButton, noButton]
      });

      // Check if we have enough votes
      if (yesVotes.size >= requiredVotes) {
        collector.stop("enough_votes");
      }
    });

    collector.on("end", async (collected, reason) => {
      await questionMessage.edit({ components: [] });

      if (reason === "enough_votes" || yesVotes.size >= requiredVotes) {
        if (interaction.channel.isThread()) {
          await sendEmbed(interaction.channel, { path: "setParentError" });
          return;
        }

        const category = findCategoryByName(
          interaction,
          process.env.PROJECTSCATEGORY
        );

        const unarchiveSuccess = await interaction.channel
          .setParent(category.id, { lockPermissions: false })
          .then(() => {
            return true;
          })
          .catch((error) => {
            logsChannel.send(
              "Error: Setting the category of channel. \n " + error
            );
            return false;
          });

        if (unarchiveSuccess) {
          await sendEmbed(interaction.channel, {
            path: "archive.movedFromWO_User",
            values: {
              channel: interaction.channel.id,
            },
          });

          await sendEmbed(logsChannel, {
            path: "archive.movedFromArchive",
            values: {
              user: interaction.user.id,
              channel: interaction.channel.id,
            },
          });
        }
      } else {
        await sendEmbed(interaction.channel, {
          path: "archive.unarchiveRejected",
          values: {
            votes: yesVotes.size,
            required: requiredVotes,
          },
        });

        await sendEmbed(logsChannel, {
          path: "archive.notMovedFromArchive",
          values: {
            user: interaction.user.id,
            channel: interaction.channel.id,
          },
        });
      }
    });
  },
};

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
    .setName("requestarchive")
    .setDescription("Ask the admins to archive this channel.")
    .addStringOption((option) =>
      option.setName("reason").setDescription("Why?").setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
  async execute(interaction) {
    const reasonText = interaction.options.getString("reason");

    // Check if channel is in PROJECTSCATEGORY
    if (!interaction.channel.parent || interaction.channel.parent.name !== process.env.PROJECTSCATEGORY) {
      return await replyEmbed(interaction, {
        path: "archive.invalidChannel",
        values: {
          category: process.env.PROJECTSCATEGORY
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

    await replyEmbed(interaction, {
      path: "requestAcquired",
      ephemeral: true,
    });

    const logsChannel = await findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );

    const yesButtonCustomID = "ArchiveYes " + interaction.id;
    const noButtonCustomID = "ArchiveNo " + interaction.id;

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
      path: "archive.question",
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
      time: 24 * 60 * 60 * 1000,
    });

    collector.on("collect", async (i) => {
      // Don't allow the request creator to vote
      if (i.user.id === requestCreatorId) {
        await i.reply({ 
          content: "You cannot vote on your own archive request.", 
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

        let archiveSuccess = false;

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

          if (isOkay) {
            archiveSuccess = true;
            break;
          }
        }

        if (archiveSuccess) {
          await sendEmbed(interaction.channel, {
            path: "archive.movedToWO_User",
            values: {
              channel: interaction.channel.id,
            },
          });

          await sendEmbed(logsChannel, {
            path: "archive.movedToArchive",
            values: {
              user: interaction.user.id,
              channel: interaction.channel.id,
            },
          });
        }
      } else {
        await sendEmbed(interaction.channel, {
          path: "archive.rejected",
          values: {
            votes: yesVotes.size,
            required: requiredVotes,
          },
        });

        await sendEmbed(logsChannel, {
          path: "archive.notMovedToArchive",
          values: {
            user: interaction.user.id,
            channel: interaction.channel.id,
          },
        });
      }
    });
  },
};

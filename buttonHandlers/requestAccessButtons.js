const { findChannel, findCategoryByName } = require("../functions.js");
const { PermissionFlagsBits } = require("discord.js");
const { sendEmbed, updateEmbed } = require("../customSend.js");
const ProjectRequest = require("../models/ProjectRequest.js");

/**
 * Handle all button interactions for the requestaccess command
 * @param {Object} interaction - The button interaction
 */
async function handleRequestAccessButtons(interaction) {
  const customId = interaction.customId;

  try {
    // All buttons have the format: translators-requestaccess-action-...
    if (customId.startsWith("translators-requestaccess-")) {
      const parts = customId.split("-");

      const action = parts[2];

      let userId, interactionId;

      switch (action) {
        case "confirm":
          // User confirmation button: translators-requestaccess-confirm-userId-interactionId
          // For Plint self-approval
          userId = parts[3];
          interactionId = parts[4];
          await handleConfirm(interaction, userId, interactionId);
          break;

        default:
          console.log(`Unknown button action: ${action}`);
          await interaction.reply({
            content: "Unknown button type. Please contact an admin.",
            ephemeral: true
          });
      }
    }
  } catch (error) {
    console.error("Error handling button:", error);
    await interaction.reply({
      content: "An error occurred while processing this request. Please try again or contact an admin.",
      ephemeral: true
    });
  }
}

/**
 * Handle confirm button (for self-approval by Plint users)
 */
async function handleConfirm(interaction, userId, interactionId) {
  if (interaction.user.id !== userId) {
    return await interaction.reply({
      content: "This button is not for you.",
      ephemeral: true
    });
  }

  const request = await ProjectRequest.findOne({ interactionId });

  if (!request) {
    return await interaction.reply({
      content: "Could not find the associated request in the database.",
      ephemeral: true
    });
  }

  const logsChannel = interaction.guild.channels.cache.get(process.env.LOGSCHANNELID);

  await updateEmbed(interaction, {
    path: "requestAcquired",
    ephemeral: true,
    components: []
  });

  await handleManualConfirm(interaction, request, logsChannel);
}

/**
 * Handle manual confirmation (for Plint users)
 */
async function handleManualConfirm(interaction, request, logsChannel) {
  let foundChannel = await findChannel(interaction, request.projectName);

  if (foundChannel) {
    foundChannel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true,
    });

    await sendEmbed(interaction.user, {
      path: "userAddNotify",
      values: {
        project: foundChannel.id,
      },
    });

    await sendEmbed(logsChannel, {
      path: "channelExisted_RA",
      values: {
        user: interaction.user.id,
        project: foundChannel.id,
        approved: interaction.user.id,
        verificationCode: request.verificationCode,
        projectName: request.projectName,
      },
    });
  } else {
    const createdChannel = await interaction.guild.channels.create({
      name: request.projectName,
      type: 0,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel],
        },
      ],
    });

    const category = await findCategoryByName(
      interaction,
      process.env.PROJECTSCATEGORY
    );

    await createdChannel.setParent(category.id, { lockPermissions: false })
      .catch(error => {
        logsChannel.send(`Error setting category: ${error.message}`);
      });

    await sendEmbed(interaction.user, {
      path: "userAddNotify",
      values: {
        project: createdChannel.id,
      },
    });

    await sendEmbed(logsChannel, {
      path: "channelCreated",
      values: {
        createdChannel: createdChannel.id,
        projectName: request.projectName,
      },
    });

    await sendEmbed(logsChannel, {
      path: "channelExisted_RA",
      values: {
        user: interaction.user.id,
        project: createdChannel.id,
        approved: interaction.user.id,
        verificationCode: request.verificationCode,
        projectName: request.projectName,
      },
    });
  }

  request.status = "approved";
  request.reviewedBy = interaction.user.id;
  await request.save();
}

module.exports = {
  handleRequestAccessButtons,
}; 
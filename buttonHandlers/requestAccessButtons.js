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

      let rejectType, userId, interactionId;

      switch (action) {
        case "accept":
          // Admin approval button: translators-requestaccess-accept-interactionId
          await handleAccept(interaction, parts[3]);
          break;

        case "rejectPN":
        case "rejectAI":
        case "rejectNWP":
          // Admin rejection buttons: translators-requestaccess-reject*-interactionId
          rejectType = action.replace("reject", "");
          await handleReject(interaction, parts[3], rejectType);
          break;

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
 * Handle accept button
 */
async function handleAccept(interaction, interactionId) {
  const request = await ProjectRequest.findOne({ interactionId });

  if (!request) {
    return await interaction.reply({
      content: "Could not find the associated request in the database.",
      ephemeral: true
    });
  }

  const logsChannel = interaction.guild.channels.cache.get(process.env.LOGSCHANNELID);

  let foundChannel = await findChannel(interaction, request.projectName);

  if (foundChannel) {
    foundChannel.permissionOverwrites.edit(request.userId, {
      ViewChannel: true,
    });

    sendEmbed(logsChannel, {
      path: "channelExisted_RA",
      values: {
        user: request.userId,
        project: foundChannel.id,
        approved: interaction.user.id,
        verificationCode: request.verificationCode,
        projectName: request.projectName,
      },
    });

    const user = await interaction.client.users.fetch(request.userId);
    sendEmbed(user, {
      path: "userAddNotify",
      values: {
        project: foundChannel.id,
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
          id: request.userId,
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

    sendEmbed(logsChannel, {
      path: "channelCreated",
      values: {
        createdChannel: createdChannel.id,
        projectName: request.projectName,
      },
    });

    sendEmbed(logsChannel, {
      path: "channelExisted_RA",
      values: {
        user: request.userId,
        project: createdChannel.id,
        approved: interaction.user.id,
        verificationCode: request.verificationCode,
        projectName: request.projectName,
      },
    });

    const user = await interaction.client.users.fetch(request.userId);
    sendEmbed(user, {
      path: "userAddNotify",
      values: {
        project: createdChannel.id,
      },
    });
  }

  request.status = "approved";
  request.reviewedBy = interaction.user.id;
  await request.save();

  await interaction.reply({
    content: `Request for ${request.projectName} has been approved.`,
    ephemeral: true
  });

  await interaction.message.delete();
}

/**
 * Handle reject button
 */
async function handleReject(interaction, interactionId, rejectType) {
  const request = await ProjectRequest.findOne({ interactionId });

  if (!request) {
    return await interaction.reply({
      content: "Could not find the associated request in the database.",
      ephemeral: true
    });
  }

  const logsChannel = interaction.guild.channels.cache.get(process.env.LOGSCHANNELID);

  let reason = "";
  switch (rejectType) {
    case "PN":
      reason = "Please make sure you've entered the correct **project name** and try again.";
      break;
    case "AI":
      reason = "Please make sure you've entered the correct **verification code** and try again.";
      break;
    case "NWP":
      reason = "We were unable to confirm your name on this project. If you are assigned to the project and think this is an error, please contact /help so it can be fixed.";
      break;
    default:
      reason = "Your request was rejected. Please try again or contact an admin for assistance.";
  }

  sendEmbed(logsChannel, {
    path: "requestAddRejected",
    values: {
      channel: request.projectName,
      user: request.userId,
      approved: interaction.user.id,
      reason: reason,
    },
  });

  const user = await interaction.client.users.fetch(request.userId);
  sendEmbed(user, {
    path: "requestAddRejectedDM",
    values: {
      channel: request.projectName,
      reason: reason,
    },
  });

  request.status = "rejected";
  request.rejectionReason = reason;
  request.reviewedBy = interaction.user.id;
  await request.save();

  await interaction.reply({
    content: `Request for ${request.projectName} has been rejected: ${reason}`,
    ephemeral: true
  });

  await interaction.message.delete();
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
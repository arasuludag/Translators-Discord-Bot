const { findChannel, findCategoryByName } = require("../functions.js");
const { PermissionFlagsBits } = require("discord.js");
const { sendEmbed, updateEmbed } = require("../customSend.js");
const AddmeRequest = require("../models/AddmeRequest");

/**
 * Handle all button interactions for the addme command
 * @param {Object} interaction - The button interaction
 */
async function handleAddmeButtons(interaction) {
  const customId = interaction.customId;

  try {
    // All addme buttons have the format: translators-addme-action-...
    if (customId.startsWith("translators-addme-")) {
      const parts = customId.split("-");

      const action = parts[2];

      let rejectType, userId, interactionId;

      switch (action) {
        case "accept":
          // Admin approval button: translators-addme-accept-interactionId
          await handleAccept(interaction, parts[3]);
          break;

        case "rejectPN":
        case "rejectAI":
        case "rejectNWP":
          // Admin rejection buttons: translators-addme-reject*-interactionId
          rejectType = action.replace("reject", "");
          await handleReject(interaction, parts[3], rejectType);
          break;

        case "confirm":
          // User confirmation button: translators-addme-confirm-userId-interactionId
          // For Plint self-approval or SASS thread joining
          userId = parts[3];
          interactionId = parts[4];
          await handleConfirm(interaction, userId, interactionId);
          break;

        default:
          console.log(`Unknown addme button action: ${action}`);
          await interaction.reply({
            content: "Unknown button type. Please contact an admin.",
            ephemeral: true
          });
      }
    }
  } catch (error) {
    console.error("Error handling addme button:", error);
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
  const request = await AddmeRequest.findOne({ interactionId });

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
  const request = await AddmeRequest.findOne({ interactionId });

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
 * Handle confirm button (for self-approval by Plint users or SASS requests)
 */
async function handleConfirm(interaction, userId, interactionId) {
  if (interaction.user.id !== userId) {
    return await interaction.reply({
      content: "This button is not for you.",
      ephemeral: true
    });
  }

  const request = await AddmeRequest.findOne({ interactionId });

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

  if (request.requestType === "sass") {
    await handleSassConfirm(interaction, request, logsChannel);
  } else {
    await handleManualConfirm(interaction, request, logsChannel);
  }
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

    sendEmbed(logsChannel, {
      path: "channelExisted",
      values: {
        user: interaction.user.id,
        project: foundChannel.id,
      },
    });

    await interaction.followUp({
      content: `You now have access to <#${foundChannel.id}>!`,
      ephemeral: true
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
        user: interaction.user.id,
        project: createdChannel.id,
        approved: interaction.user.id,
        verificationCode: request.verificationCode,
        projectName: request.projectName,
      },
    });

    await interaction.followUp({
      content: `You now have access to <#${createdChannel.id}>!`,
      ephemeral: true
    });
  }

  request.status = "approved";
  request.reviewedBy = interaction.user.id;
  await request.save();
}

/**
 * Handle sass confirmation
 */
async function handleSassConfirm(interaction, request, logsChannel) {
  const channel = await interaction.guild.channels.cache.get(
    process.env.PROJECTCHANNELREQUESTSCHANNELID
  );

  if (!channel) {
    return await interaction.followUp({
      content: "Could not find the project channel requests channel. Please contact an admin.",
      ephemeral: true
    });
  }

  let thread = await channel.threads.cache.find(
    (x) => x.name === request.projectName
  );

  if (!thread) {
    let archivedThreads = await channel.threads?.fetchArchived();
    thread = await archivedThreads?.threads.find(
      (x) => x.name === request.projectName
    );
  }

  if (thread) {
    await thread.setArchived(false);
    await thread.members.add(interaction.user.id);

    await sendEmbed(interaction.user, {
      path: "userAddNotify",
      values: {
        project: thread.id,
      },
    });

    await sendEmbed(logsChannel, {
      path: "buddyUpLog",
      values: {
        thread: thread.id,
        user: interaction.user.id,
      },
    });
  } else {
    thread = await channel.threads.create({
      name: request.projectName,
      autoArchiveDuration: 10080,
      type: process.env.THREADTYPE,
      reason: `For ${request.projectName}`,
    });

    if (thread.joinable) await thread.join();
    await thread.members.add(interaction.user.id);

    await sendEmbed(interaction.user, {
      path: "userAddNotify",
      values: {
        project: thread.id,
      },
    });

    await sendEmbed(logsChannel, {
      path: "buddyUpLog",
      values: {
        thread: thread.id,
        user: interaction.user.id,
      },
    });

    await sendEmbed(channel, {
      path: "threadCreated",
      values: {
        thread: request.projectName,
        user: interaction.user.id,
      },
    });
  }

  request.status = "approved";
  request.reviewedBy = "system";
  await request.save();
}

module.exports = { handleAddmeButtons }; 
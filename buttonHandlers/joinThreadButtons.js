const { sendEmbed, updateEmbed } = require("../customSend.js");
const ProjectRequest = require("../models/ProjectRequest.js");

/**
 * Handle all button interactions for the jointhread command
 * @param {Object} interaction - The button interaction
 */
async function handleJoinThreadButtons(interaction) {
  const customId = interaction.customId;

  try {
    // All buttons have the format: translators-jointhread-action-...
    if (customId.startsWith("translators-jointhread-")) {
      const parts = customId.split("-");

      const action = parts[2];

      let userId, interactionId;

      switch (action) {
        case "confirm":
          // User confirmation button: translators-jointhread-confirm-userId-interactionId
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
 * Handle confirm button
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

  await handleThreadConfirm(interaction, request, logsChannel);
}

/**
 * Handle thread confirmation
 */
async function handleThreadConfirm(interaction, request, logsChannel) {
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

module.exports = {
  handleJoinThreadButtons,
}; 
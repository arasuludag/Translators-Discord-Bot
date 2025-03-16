const {
  SlashCommandBuilder,
  ButtonBuilder,
  ActionRowBuilder,
} = require("discord.js");
const {
  findChannelByID,
  discordStyleProjectName,
  findChannel,
  findCategoryByName,
} = require("../functions.js");
const { PermissionFlagsBits } = require("discord.js");
const { replyEmbed, sendEmbed } = require("../customSend.js");
const AddmeRequest = require("../models/AddmeRequest");
const ProjectCredential = require("../models/ProjectCredential");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addme")
    .setDescription("Request admins to add you to a certain project channel.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("manual")
        .setDescription(
          "Request admins to add you to a certain project channel."
        )
        .addStringOption((option) =>
          option
            .setName("project_name")
            .setDescription("Name of the project. Beware of typos!")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("verification_code")
            .setDescription("Verification code.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("sass")
        .setDescription("Add yourself to a certain project thread.")
        .addStringOption((option) =>
          option
            .setName("project_name")
            .setDescription("Name of the project. Beware of typos!")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
  async execute(interaction) {
    const logsChannel = findChannelByID(interaction, process.env.LOGSCHANNELID);
    const channelName = interaction.options.getString("project_name");
    const verificationCode = interaction.options.getString("verification_code") || "";

    let projectName;
    try {
      projectName = discordStyleProjectName(channelName);
    } catch (error) {
      await replyEmbed(interaction, {
        path: "enterProperName",
        ephemeral: true,
      });
      return;
    }

    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`translators-addme-confirm-${interaction.user.id}-${interaction.id}`)
        .setLabel("Confirm")
        .setStyle("Success")
    );

    if (interaction.options.getSubcommand() === "manual") {
      await manualAdd(
        interaction,
        projectName,
        button,
        logsChannel,
        verificationCode
      );
    } else {
      await sassAdd(interaction, projectName, button);
    }
  },
};

async function manualAdd(
  interaction,
  projectName,
  button,
  logsChannel,
  verificationCode
) {
  const isPlint = await interaction.member.roles.cache.some(
    (role) => role.name === process.env.PROJECTMANAGERROLENAME
  );

  if (isPlint) {
    // For Plint users who can self-approve
    try {
      await AddmeRequest.create({
        userId: interaction.user.id,
        username: interaction.user.tag,
        projectName: projectName,
        verificationCode: verificationCode || "",
        requestType: "manual",
        interactionId: interaction.id,
        status: "pending",
      });
    } catch (error) {
      console.error("Error saving Plint request to MongoDB:", error);
      logsChannel.send(`Error saving Plint request to MongoDB: ${error.message}`);
    }

    await replyEmbed(interaction, {
      path: "addMePrompt",
      values: {
        projectName: projectName,
      },
      components: [button],
      ephemeral: true,
    });
  } else {
    if (verificationCode) {
      const verificationResult = await verifyProjectCredentials(
        projectName,
        verificationCode,
        interaction.user.id,
        interaction.user.tag
      );

      if (verificationResult.success) {
        await handleAutomaticApproval(
          interaction,
          projectName,
          verificationCode,
          logsChannel,
          verificationResult.credential
        );
        return;
      } else if (verificationResult.reason === "invalid_code") {
        // Credentials found but code doesn't match - continue with manual approval
        // Don't show an error message, as the additional info might be intended for admins
      } else if (verificationResult.reason === "expired") {
        // Credentials found but expired
        await replyEmbed(interaction, {
          path: "credentials.expiredCredentials",
          ephemeral: true,
        });
        return;
      } else if (verificationResult.reason === "not_ready") {
        // Channel doesn't exist and no credentials found - continue with manual approval
      }
    }

    const approvalChannel = findChannel(
      interaction,
      process.env.AWAITINGAPPROVALSCHANNELNAME
    );

    await sendEmbed(interaction.user, {
      path: "waitApproval",
      values: {
        project: projectName,
      },
    });

    await replyEmbed(interaction, {
      path: "requestAcquired",
      ephemeral: true,
    });

    const acceptButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`translators-addme-accept-${interaction.id}`)
        .setLabel("Approve")
        .setStyle("Success")
    );
    const rejectPNButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`translators-addme-rejectPN-${interaction.id}`)
        .setLabel("Reject - Project Name")
        .setStyle("Danger")
    );
    const rejectAIButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`translators-addme-rejectAI-${interaction.id}`)
        .setLabel("Reject - Additional Info")
        .setStyle("Danger")
    );
    const rejectNWPButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`translators-addme-rejectNWP-${interaction.id}`)
        .setLabel("Reject - Not Working on the Project")
        .setStyle("Danger")
    );

    let foundChannel = await findChannel(interaction, projectName);

    try {
      await AddmeRequest.create({
        userId: interaction.user.id,
        username: interaction.user.tag,
        projectName: projectName,
        verificationCode: verificationCode || "",
        requestType: "manual",
        interactionId: interaction.id,
        status: "pending",
      });
    } catch (error) {
      console.error("Error saving request to MongoDB:", error);
      logsChannel.send(`Error saving request to MongoDB: ${error.message}`);
    }

    await sendEmbed(approvalChannel, {
      path: "addRequest",
      values: {
        user: interaction.user.id,
        projectChannel: foundChannel ? `<#${foundChannel.id}>` : projectName,
        projectName: projectName,
        verificationCode: verificationCode,
      },
      components: [
        acceptButton,
        rejectPNButton,
        rejectAIButton,
        rejectNWPButton,
      ],
    });
  }
}

async function sassAdd(interaction, projectName, button) {
  try {
    await AddmeRequest.create({
      userId: interaction.user.id,
      username: interaction.user.tag,
      projectName: projectName,
      additionalInfo: "",
      requestType: "sass",
      interactionId: interaction.id,
      status: "pending",
    });
  } catch (error) {
    console.error("Error saving SASS request to MongoDB:", error);
    const logsChannel = interaction.guild.channels.cache.get(process.env.LOGSCHANNELID);
    if (logsChannel) {
      logsChannel.send(`Error saving SASS request to MongoDB: ${error.message}`);
    }
  }

  await replyEmbed(interaction, {
    path: "addMePromptThread",
    values: {
      projectName: projectName,
    },
    ephemeral: true,
    components: [button],
  });
}

/**
 * Verify project credentials
 * @param {String} projectName - The project name
 * @param {String} verificationCode - The verification code
 * @param {String} userId - The user ID
 * @param {String} username - The username
 * @returns {Object} Verification result
 */
async function verifyProjectCredentials(projectName, verificationCode, userId, username) {
  try {
    const result = await ProjectCredential.verifyCredentials(projectName, verificationCode);

    if (result.success) {
      result.credential.logUsage(userId, username, true);
      await result.credential.save();
      return result;
    }

    if (result.reason === "invalid_code" || result.reason === "expired") {
      const credential = await ProjectCredential.findOne({ projectName });
      if (credential) {
        credential.logUsage(userId, username, false, result.reason);
        await credential.save();
      }
      return result;
    }

    if (result.reason === "project_not_found") {
      return {
        success: false,
        reason: "not_ready",
        message: "Channel not ready"
      };
    }

    return result;
  } catch (error) {
    console.error("Error verifying project credentials:", error);
    return {
      success: false,
      reason: "error",
      message: "An error occurred while verifying credentials"
    };
  }
}

/**
 * Handle automatic approval when credentials match
 */
async function handleAutomaticApproval(interaction, projectName, verificationCode, logsChannel, credential) {
  let foundChannel = await findChannel(interaction, projectName);

  if (foundChannel) {
    foundChannel.permissionOverwrites.edit(interaction.user.id, {
      ViewChannel: true,
    });

    await replyEmbed(interaction, {
      path: "userAddNotify",
      values: {
        project: foundChannel.id,
      },
      ephemeral: true,
    });

    sendEmbed(logsChannel, {
      path: "credentials.autoApprovalLog",
      values: {
        user: interaction.user.id,
        project: foundChannel.id,
        projectName: projectName,
        verificationCode,
      },
    });

    try {
      await AddmeRequest.create({
        userId: interaction.user.id,
        username: interaction.user.tag,
        projectName: projectName,
        verificationCode,
        requestType: "manual",
        interactionId: interaction.id,
        status: "approved",
        reviewedBy: "auto",
      });
    } catch (error) {
      console.error("Error saving auto-approved request to MongoDB:", error);
      logsChannel.send(`Error saving auto-approved request to MongoDB: ${error.message}`);
    }
  } else {
    try {
      const createdChannel = await interaction.guild.channels.create({
        name: projectName,
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
          {
            id: credential.createdBy,
            allow: [PermissionFlagsBits.ViewChannel],
          },
        ],
      });

      const category = await findCategoryByName(
        interaction,
        process.env.PROJECTSCATEGORY
      );

      await createdChannel
        .setParent(category.id, { lockPermissions: false })
        .catch((error) => {
          logsChannel.send(
            "Error: Setting the category of channel. \n " + error
          );
        });

      await replyEmbed(interaction, {
        path: "userAddNotify",
        values: {
          project: createdChannel.id,
        },
        ephemeral: true,
      });

      sendEmbed(logsChannel, {
        path: "channelCreated",
        values: {
          createdChannel: createdChannel.id,
          projectName: projectName,
        },
      });

      sendEmbed(logsChannel, {
        path: "credentials.autoApprovalLog",
        values: {
          user: interaction.user.id,
          project: createdChannel.id,
          projectName: projectName,
          verificationCode,
        },
      });

      try {
        await AddmeRequest.create({
          userId: interaction.user.id,
          username: interaction.user.tag,
          projectName: projectName,
          verificationCode,
          requestType: "manual",
          interactionId: interaction.id,
          status: "approved",
          reviewedBy: "auto",
        });
      } catch (error) {
        console.error("Error saving auto-approved request to MongoDB:", error);
        logsChannel.send(`Error saving auto-approved request to MongoDB: ${error.message}`);
      }
    } catch (error) {
      interaction.reply({
        content: `There was an error creating the channel ${projectName}. Please try again later or contact an admin.`,
        ephemeral: true,
      });

      logsChannel.send(
        `Error: There was an error while creating the channel ${projectName}
        You may have exceeded the channel limit.
        ${error}`
      );
    }
  }
}

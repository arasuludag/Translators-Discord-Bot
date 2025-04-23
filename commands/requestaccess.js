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
const Request = require("../models/ProjectRequest.js");
const ProjectCredential = require("../models/ProjectCredential");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("requestaccess")
    .setDescription("Request admins to add you to a certain project channel.")
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
        .setCustomId(`translators-requestaccess-confirm-${interaction.user.id}-${interaction.id}`)
        .setLabel("Confirm")
        .setStyle("Success")
    );

    await manualAdd(
      interaction,
      projectName,
      button,
      logsChannel,
      verificationCode
    );
  },
  manualAdd,
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
      await Request.create({
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
        await replyEmbed(interaction, {
          path: "credentials.invalidCode",
          ephemeral: true,
        });
        return;
      } else if (verificationResult.reason === "expired") {
        await replyEmbed(interaction, {
          path: "credentials.expiredCredentials",
          ephemeral: true,
        });
        return;
      } else if (verificationResult.reason === "not_ready") {
        await replyEmbed(interaction, {
          path: "credentials.projectNotReady",
          ephemeral: true,
        });
        return;
      }
    } else {
      await replyEmbed(interaction, {
        path: "credentials.missingCode",
        ephemeral: true,
      });
      return;
    }
  }
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
      await Request.create({
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
        await Request.create({
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
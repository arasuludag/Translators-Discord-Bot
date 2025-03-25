const {
  SlashCommandBuilder,
  ButtonBuilder,
  ActionRowBuilder,
} = require("discord.js");
const {
  discordStyleProjectName,
} = require("../functions.js");
const { PermissionFlagsBits } = require("discord.js");
const { replyEmbed } = require("../customSend.js");
const Request = require("../models/ProjectRequest.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("jointhread")
    .setDescription("Add yourself to a certain project thread.")
    .addStringOption((option) =>
      option
        .setName("project_name")
        .setDescription("Name of the project. Beware of typos!")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
  async execute(interaction) {
    const channelName = interaction.options.getString("project_name");

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
        .setCustomId(`translators-jointhread-confirm-${interaction.user.id}-${interaction.id}`)
        .setLabel("Confirm")
        .setStyle("Success")
    );

    await sassAdd(interaction, projectName, button);
  },
};

async function sassAdd(interaction, projectName, button) {
  try {
    await Request.create({
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
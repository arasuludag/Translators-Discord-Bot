const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("isthere")
    .setDescription("Is there a project with this name")
    .addStringOption((option) =>
      option
        .setName("project_name")
        .setDescription("Name of the project")
        .setRequired(true)
    ),
  async execute(interaction) {
    const projectName = interaction.options.getString("project_name");
    const foundChannel = functions.findChannel(
      interaction,
      functions.discordStyleProjectName(projectName)
    );
    if (foundChannel)
      interaction.reply(
        functions.randomText("isThere.yes", { foundChannel: foundChannel.id })
      );
    else interaction.reply(functions.randomText("isThere.no", {}));
  },
};

const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("available")
    .setDescription(
      "Ask if there are any available linguists from a certain language pool."
    )
    .addRoleOption((option) =>
      option.setName("language").setDescription("A language").setRequired(true)
    ),
  async execute(interaction) {
    const role = interaction.options.getRole("language");

    interaction.reply(
      functions.randomText("available.asking", {
        user: interaction.user.id,
        role: role.id,
      })
    );
  },
};

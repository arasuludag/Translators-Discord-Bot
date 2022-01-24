const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("available")
    .setDescription("Any available linguists for a certain language?")
    .addRoleOption((option) =>
      option.setName("language").setDescription("A language").setRequired(true)
    ),
  async execute(interaction) {
    role = interaction.options.getRole("language");

    interaction.reply(
      functions.randomText("available.asking", {
        user: interaction.user.id,
        role: role.id,
      })
    );
  },
};

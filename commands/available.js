const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");
const { globalLingSupportChannelID } = require("../config.json");

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

    await interaction.reply(
      functions.randomSend({ path: "requestAcquired", ephemeral: true })
    );

    await functions
      .findChannelByID(interaction, globalLingSupportChannelID)
      .send(
        functions.randomSend({
          path: "available.asking",
          values: {
            user: interaction.user.id,
            role: role.id,
          },
          content: role.toString(),
        })
      )
      .catch((err) => console.log("Cannot be sent.", err));
  },
};

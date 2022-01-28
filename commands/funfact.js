const { SlashCommandBuilder } = require("@discordjs/builders");
const { embedColor } = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("funfact")
    .setDescription("A funfact."),
  async execute(interaction) {
    const funfacts = require("../funfacts.json");

    interaction.reply({
      embeds: [
        {
          color: embedColor,
          title: "Funfact!",
          description:
            funfacts.funfacts[
              Math.floor(Math.random() * funfacts.funfacts.length)
            ],
        },
      ],
    });
  },
};

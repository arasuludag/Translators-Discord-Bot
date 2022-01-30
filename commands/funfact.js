const { SlashCommandBuilder } = require("@discordjs/builders");
const { embedColor } = require("../config.json");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("funfact")
    .setDescription("A funfact."),
  async execute(interaction) {
    const data = () =>
      fs.readFileSync(require.resolve("../funfacts.json"), {
        encoding: "utf8",
      });
    const dataJSON = JSON.parse(data());
    const random = Math.floor(Math.random() * dataJSON.funfacts.length);
    const funfact = dataJSON.funfacts[random];

    if (
      funfact.includes(".gif") ||
      funfact.includes(".png") ||
      funfact.includes(".jpg")
    ) {
      interaction.reply(funfact);
    } else {
      interaction.reply({
        embeds: [
          {
            color: embedColor,
            title: "Funfact!",
            description: dataJSON.funfacts[random],
          },
        ],
      });
    }
  },
};

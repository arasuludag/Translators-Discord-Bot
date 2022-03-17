const { SlashCommandBuilder } = require("@discordjs/builders");
const { embedColor, zenChannelName } = require("../config.json");
const fs = require("fs");
const { findChannel, randomSend } = require("../functions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("funfact")
    .setDescription("A funfact."),
  async execute(interaction) {
    const zenChannel = await findChannel(interaction, zenChannelName);

    await interaction.reply(
      randomSend({ path: "requestAcquired", ephemeral: true })
    );

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
      zenChannel.send(funfact);
    } else {
      zenChannel.send({
        embeds: [
          {
            color: embedColor,
            title: "Fun fact!",
            description: dataJSON.funfacts[random],
          },
        ],
      });
    }
  },
};

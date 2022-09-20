const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const { findChannel, randomSend } = require("../functions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("funfact")
    .setDescription("A funfact.")
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
  async execute(interaction) {
    const zenChannel = await findChannel(
      interaction,
      process.env.ZENCHANNELNAME
    );

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

    if (!dataJSON.funfacts) {
      return;
    }

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
            color: process.env.EMBEDCOLOR,
            title: "Fun fact!",
            description: dataJSON.funfacts[random],
          },
        ],
      });
    }
  },
};

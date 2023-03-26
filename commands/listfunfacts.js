const fs = require("fs");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("listfunfacts")
    .setDescription("[ADMIN] List funfacts. ALL OF THEM!")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const data = () =>
      fs.readFileSync(require.resolve("../funfacts.json"), {
        encoding: "utf8",
      });

    const dataJSON = JSON.parse(data());

    if (!dataJSON.funfacts) {
      return;
    }

    let funfacts = "";
    dataJSON.funfacts.map((fact) => {
      funfacts = funfacts.concat(`${fact}\n`);
    });

    interaction.reply({ content: "Funfacts: \n" + funfacts, ephemeral: true });
  },
};

const fs = require("fs");
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { replyEmbed } = require("../customSend");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removefunfact")
    .setDescription("[ADMIN] Remove all funfacts that has this string in.")
    .addStringOption((option) =>
      option
        .setName("funfact")
        .setDescription("Be careful please.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const string = interaction.options.getString("funfact");

    fs.readFile(require.resolve("../funfacts.json"), function (err, data) {
      let json = JSON.parse(data);

      json.funfacts = json.funfacts.filter(
        (funfact) => !funfact.includes(string)
      );

      const saveableJSON = JSON.stringify(json, null, 2); // convert it back to json
      fs.writeFile(
        require.resolve("../funfacts.json"),
        saveableJSON,
        "utf8",
        async () => {
          await replyEmbed(interaction, {
            path: "requestCompleted",
            ephemeral: true,
          });
        }
      ); // write it back
    });
  },
};

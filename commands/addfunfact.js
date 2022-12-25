require("dotenv").config();
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { replyEmbed } = require("../customSend.js");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addfunfact")
    .setDescription("Add a funfact to the list.")
    .addStringOption((option) =>
      option
        .setName("funfact")
        .setDescription("Enter a funfact.")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  async execute(interaction) {
    const funfact = interaction.options.getString("funfact");

    fs.readFile(
      require.resolve("../funfacts.json"),
      "utf8",
      function readFileCallback(err, data) {
        if (err) {
          console.log(err);
        } else {
          let obj = JSON.parse(data); // Parse it into JSON.
          obj.funfacts.push(funfact); // Add the data.
          const json = JSON.stringify(obj, null, 2); // Convert it back to stringified JSON.
          fs.writeFile(
            require.resolve("../funfacts.json"),
            json,
            "utf8",
            async () => {
              await replyEmbed(interaction, {
                path: "addFunfact.added",
                ephemeral: true,
                values: {
                  funfact: funfact,
                },
              });
            }
          ); // Write it back.
        }
      }
    );
  },
};

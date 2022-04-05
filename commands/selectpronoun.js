const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageButton, MessageActionRow } = require("discord.js");
const functions = require("../functions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("selectpronoun")
    .setDescription("Please select your preferred pronouns."),
  async execute(interaction) {
    let options = [];
    process.env.PRONOUNS.split(",").map((option, i) => {
      options[i] = new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(option + "->" + interaction.id)
          .setLabel(option)
          .setStyle("PRIMARY")
      );
    });

    await interaction
      .reply({
        content: "Choose.",
        ephemeral: true,
        components: options,
      })
      .then(() => {
        const filter = (i) => interaction.id === i.customId.split("->")[1];
        const collector = interaction.channel.createMessageComponentCollector({
          filter,
          time: 120000,
        });

        collector.on("collect", async (i) => {
          let isAdd;

          function roleManager(roleName) {
            const role = i.guild.roles.cache.find((r) => r.name === roleName);

            const { guild } = i; // Store the guild of the reaction in variable

            const member = guild.members.cache.find(
              (member) => member.id === i.user.id
            ); // Find the member who reacted

            if (member.roles.cache.some((role) => role.name === roleName)) {
              member.roles.remove(role);
              isAdd = false;
              notify(roleName);
            } else {
              member.roles.add(role); //assign selected role to member
              isAdd = true;
              notify(roleName);
            }
          }

          function notify(pronoun) {
            i.user
              .send(
                functions.randomSend({
                  path: "userPronounNotify",
                  values: {
                    pronoun: pronoun,
                    isAdd: isAdd ? "" : "not",
                  },
                })
              )
              .catch(() => {
                console.error("Failed to send DM");
              });
          }
          roleManager(i.customId.split("->")[0]);

          await i.update({
            content: `${isAdd ? "Added" : "Removed"} ${
              i.customId.split("->")[0]
            }`,
          });
        });

        collector.on("end", async () => {
          await interaction.editReply({
            ephemeral: true,
            components: [],
          });
        });
      });
  },
};

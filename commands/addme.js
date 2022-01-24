const { SlashCommandBuilder } = require("@discordjs/builders");
const { Permissions } = require("discord.js");
const functions = require("../functions.js");
const { projectsCategory, notificationChannelName } = require("../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addme")
    .setDescription("Adds user to a project.")
    .addStringOption((option) =>
      option
        .setName("project_name")
        .setDescription("Name of the project. Beware of typos.")
        .setRequired(true)
    ),
  async execute(interaction) {
    const privateChannel = functions.findChannel(interaction, notificationChannelName);

    var projectName = interaction.options.getString("project_name");
    await interaction.reply(
      functions.randomText("addMePrompt", { projectName: projectName })
    );
    const replyMessage = await interaction.fetchReply();

    var filter = (reaction, user) => {
      return reaction.emoji.name === "👍" && user.id === interaction.user.id;
    };
    var collector = replyMessage.createReactionCollector({
      filter,
      time: 100000,
    });

    collector.on("collect", () => {
      const foundChannel = functions.findChannel(
        interaction,
        functions.discordStyleProjectName(projectName)
      );
      if (foundChannel) {
        foundChannel.permissionOverwrites.edit(interaction.user.id, {
          VIEW_CHANNEL: true,
        });

        interaction.channel.send(
          functions.randomText("channelExisted", {
            user: interaction.user.id,
            project: foundChannel.id,
          })
        );

        privateChannel.send(
          functions.randomText("channelExisted", {
            user: interaction.user.id,
            project: foundChannel.id,
          })
        );
      } else {
        interaction.guild.channels
          .create(projectName, {
            type: "GUILD_TEXT",
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: [Permissions.FLAGS.VIEW_CHANNEL],
              },
              {
                id: interaction.user.id,
                allow: [Permissions.FLAGS.VIEW_CHANNEL],
              },
            ],
          })
          .then((createdChannel) => {
            let category = interaction.guild.channels.cache.find(
              (c) => c.name == projectsCategory && c.type == "GUILD_CATEGORY"
            );

            if (!category) throw new Error("Category channel does not exist");
            createdChannel.setParent(category.id);

            interaction.channel.send(
              functions.randomText("channelCreated", {
                createdChannel: createdChannel.id,
                user: interaction.user.id,
              })
            );

            privateChannel.send(
              functions.randomText("channelCreated", {
                createdChannel: createdChannel.id,
                user: interaction.user.id,
              })
            );
          })
          .catch(console.error);
      }
    });
  },
};

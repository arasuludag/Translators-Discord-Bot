const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");
const { projectsCategory, notificationChannelName } = require("../config.json");
const { Permissions } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("requestadd")
    .setDescription("Request mods to add you to a certain project channel.")
    .addStringOption((option) =>
      option
        .setName("project_name")
        .setDescription("Name of the project. Beware of typos!")
        .setRequired(true)
    ),
  async execute(interaction) {
    const privateChannel = functions.findChannel(
      interaction,
      notificationChannelName
    );
    const projectName = interaction.options.getString("project_name");

    await interaction.user.send(
      functions.randomText("waitApproval", {
        project: projectName,
      })
    );
    await interaction.reply({
      content: functions.randomEphemeralText("requestAcquired", {}),
      ephemeral: true,
    });

    await privateChannel
      .send(
        functions.randomText("addRequest", {
          user: interaction.user.id,
          projectName: projectName,
        })
      )
      .then((replyMessage) => {
        const filter = (reaction) => reaction.emoji.name === "✅";

        const collector = replyMessage.createReactionCollector({
          filter,
          time: 300000,
        });

        collector.on("collect", async () => {
          const foundChannel = await functions.findChannel(
            interaction,
            functions.discordStyleProjectName(projectName)
          );
          if (foundChannel) {
            foundChannel.permissionOverwrites.edit(interaction.user.id, {
              VIEW_CHANNEL: true,
            });

            replyMessage.channel.send(
              functions.randomText("channelExisted", {
                user: interaction.user.id,
                project: foundChannel.id,
              })
            );
            interaction.user.send(
              functions.randomText("userAddNotify", {
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
                  (c) =>
                    c.name == projectsCategory && c.type == "GUILD_CATEGORY"
                );

                if (!category)
                  throw new Error("Category channel does not exist");
                createdChannel.setParent(category.id);

                replyMessage.channel.send(
                  functions.randomText("channelCreated", {
                    createdChannel: createdChannel.id,
                    user: interaction.user.id,
                  })
                );
                interaction.user.send(
                  functions.randomText("userAddNotify", {
                    user: interaction.user.id,
                    project: createdChannel,
                  })
                );
              });
          }
        });
      });
  },
};

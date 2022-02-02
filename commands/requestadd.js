const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");
const {
  projectsCategory,
  awaitingApprovalsChannelName,
  logsChannelName,
} = require("../config.json");
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
    const approvalChannel = functions.findChannel(
      interaction,
      awaitingApprovalsChannelName
    );
    const logsChannel = functions.findChannel(interaction, logsChannelName);
    const channelName = interaction.options.getString("project_name");

    await interaction.user.send(
      functions.randomText("waitApproval", {
        project: channelName,
      })
    );
    await interaction.reply({
      content: functions.randomEphemeralText("requestAcquired", {}),
      ephemeral: true,
    });

    await approvalChannel
      .send(
        functions.randomText("addRequest", {
          user: interaction.user.id,
          projectName: channelName,
        })
      )
      .then((replyMessage) => {
        replyMessage.react("✅");
        replyMessage.react("❌");

        const filter = (reaction, user) =>
          (reaction.emoji.name === "✅" || reaction.emoji.name === "❌") &&
          !user.bot;

        const collector = replyMessage.createReactionCollector({
          filter,
          time: 300000000,
          max: 1,
        });

        collector.on("collect", async (reaction, user) => {
          replyMessage.react("🍻");
          if (reaction.emoji.name === "✅") {
            const foundChannel = await functions.findChannel(
              interaction,
              functions.discordStyleProjectName(channelName)
            );
            if (foundChannel) {
              foundChannel.permissionOverwrites.edit(interaction.user.id, {
                VIEW_CHANNEL: true,
              });

              logsChannel.send(
                functions.randomText("channelExisted_RA", {
                  user: interaction.user.id,
                  project: foundChannel.id,
                  approved: user.id,
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
                .create(channelName, {
                  type: "GUILD_TEXT",
                  permissionOverwrites: [
                    {
                      id: interaction.guild.id,
                      deny: [Permissions.FLAGS.VIEW_CHANNEL],
                    },
                  ],
                })
                .then(async (createdChannel) => {
                  const category = await functions.findCategoryByName(
                    interaction,
                    projectsCategory
                  );
                  await createdChannel.setParent(category.id);

                  await createdChannel.permissionOverwrites.edit(
                    interaction.user.id,
                    {
                      VIEW_CHANNEL: true,
                    }
                  );

                  logsChannel.send(
                    functions.randomText("channelCreated_RA", {
                      createdChannel: createdChannel.id,
                      user: interaction.user.id,
                      approved: user.id,
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
          } else {
            logsChannel.send(
              functions.randomText("requestAddRejected", {
                channel: channelName,
                user: interaction.user.id,
                approved: user.id,
              })
            );
            interaction.user.send(
              functions.randomText("requestAddRejectedDM", {
                channel: channelName,
              })
            );
          }
        });
      });
  },
};

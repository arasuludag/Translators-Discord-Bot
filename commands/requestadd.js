const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageButton, MessageActionRow } = require("discord.js");
const functions = require("../functions.js");
const {
  projectsCategory,
  awaitingApprovalsChannelName,
  logsChannelID,
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
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Why?")
    ),
  async execute(interaction) {
    const approvalChannel = functions.findChannel(
      interaction,
      awaitingApprovalsChannelName
    );
    const logsChannel = functions.findChannelByID(interaction, logsChannelID);
    const channelName = interaction.options.getString("project_name");
    const reason = interaction.options.getString("reason");

    await interaction.user
      .send(
        functions.randomText("waitApproval", {
          project: channelName,
        })
      )
      .catch(() => {
        console.error("Failed to send DM");
      });
    await interaction.reply({
      content: functions.randomEphemeralText("requestAcquired", {}),
      ephemeral: true,
    });

    const acceptButtonCustomID = "Accept" + interaction.id;
    const rejectButtonCustomID = "Reject" + interaction.id;

    const acceptButton = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(acceptButtonCustomID)
        .setLabel("Accept")
        .setStyle("SUCCESS")
    );
    const rejectButton = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(rejectButtonCustomID)
        .setLabel("Reject")
        .setStyle("DANGER")
    );

    await approvalChannel
      .send(
        functions.randomText(
          "addRequest",
          {
            user: interaction.user.id,
            projectName: channelName,
            reason: reason ? `\nReason: ${reason}` : " ",
          },
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          [acceptButton, rejectButton]
        )
      )
      .then((replyMessage) => {
        const filter = (i) =>
          i.customId === acceptButtonCustomID || rejectButtonCustomID;

        const collector = replyMessage.channel.createMessageComponentCollector({
          filter,
          max: 1,
          time: 300000000,
        });

        collector.on("collect", async (i) => {
          await i.update({
            components: [],
          });
          replyMessage.react("🍻");

          if (i.customId === acceptButtonCustomID) {
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
                  approved: i.user.id,
                })
              );
              interaction.user
                .send(
                  functions.randomText("userAddNotify", {
                    project: foundChannel.id,
                  })
                )
                .catch(() => {
                  console.error("Failed to send DM");
                });
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
                  await createdChannel.setParent(category.id).catch((error) => {
                    logsChannel.send("Error. ", error);
                  });

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
                      approved: i.user.id,
                    })
                  );
                  interaction.user
                    .send(
                      functions.randomText("userAddNotify", {
                        user: interaction.user.id,
                        project: createdChannel,
                      })
                    )
                    .catch(() => {
                      console.error("Failed to send DM");
                    });
                })
                .catch((error) => {
                  logsChannel.send("Error. ", error);
                });
            }
          } else {
            logsChannel.send(
              functions.randomText("requestAddRejected", {
                channel: channelName,
                user: interaction.user.id,
                approved: i.user.id,
              })
            );
            interaction.user
              .send(
                functions.randomText("requestAddRejectedDM", {
                  channel: channelName,
                })
              )
              .catch(() => {
                console.error("Failed to send DM");
              });
          }
        });
      });
  },
};

const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageButton, MessageActionRow } = require("discord.js");
const functions = require("../functions.js");
const { Permissions } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("requestadd")
    .setDescription("Request admins to add you to a certain project channel.")
    .addStringOption((option) =>
      option
        .setName("project_name")
        .setDescription("Name of the project. Beware of typos!")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("additional_info").setDescription("Why?").setRequired(true)
    ),
  async execute(interaction) {
    const approvalChannel = functions.findChannel(
      interaction,
      process.env.AWAITINGAPPROVALSCHANNELNAME
    );
    const logsChannel = functions.findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );
    const channelName = interaction.options.getString("project_name");
    const additionalInfo = interaction.options.getString("additional_info");

    let projectName;
    try {
      projectName = functions.discordStyleProjectName(channelName);
    } catch (error) {
      await interaction.reply(
        functions.randomSend({
          path: "enterProperName",
          ephemeral: true,
        })
      );
      return;
    }

    await interaction.user
      .send(
        functions.randomSend({
          path: "waitApproval",
          values: {
            project: projectName,
          },
        })
      )
      .catch(() => {
        console.error("Failed to send DM");
      });
    await interaction.reply(
      functions.randomSend({ path: "requestAcquired", ephemeral: true })
    );

    const acceptButtonCustomID = "Accept " + interaction.id;
    const rejectButtonCustomID = "Reject " + interaction.id;

    const acceptButton = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(acceptButtonCustomID)
        .setLabel("Approve")
        .setStyle("SUCCESS")
    );
    const rejectButton = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(rejectButtonCustomID)
        .setLabel("Reject")
        .setStyle("DANGER")
    );

    let foundChannel = await functions.findChannel(interaction, projectName);

    await approvalChannel
      .send(
        functions.randomSend({
          path: "addRequest",
          values: {
            user: interaction.user.id,
            projectName: foundChannel ? `<#${foundChannel.id}>` : projectName,
            additionalInfo: additionalInfo,
          },
          components: [acceptButton, rejectButton],
        })
      )
      .then((replyMessage) => {
        const filter = (i) => interaction.id === i.customId.split(" ")[1];

        const collector = replyMessage.channel.createMessageComponentCollector({
          filter,
          max: 1,
        });

        collector.on("collect", async (i) => {
          await i.update({
            components: [],
          });
          replyMessage.react("🍻");

          if (i.customId === acceptButtonCustomID) {
            // I'm double checking because if the channel didn't exist when the request was made,
            // it doesn't mean that it still doesn't exist when someone approves the request.
            foundChannel = await functions.findChannel(
              interaction,
              projectName
            );

            if (foundChannel) {
              foundChannel.permissionOverwrites.edit(interaction.user.id, {
                VIEW_CHANNEL: true,
              });

              logsChannel.send(
                functions.randomSend({
                  path: "channelExisted_RA",
                  values: {
                    user: interaction.user.id,
                    project: foundChannel.id,
                    approved: i.user.id,
                  },
                })
              );
              interaction.user
                .send(
                  functions.randomSend({
                    path: "userAddNotify",
                    values: {
                      project: foundChannel.id,
                    },
                  })
                )
                .catch(() => {
                  console.error("Failed to send DM");
                });
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
                .then(async (createdChannel) => {
                  const category = await functions.findCategoryByName(
                    interaction,
                    process.env.PROJECTSCATEGORY
                  );
                  await createdChannel
                    .setParent(category.id, { lockPermissions: false })
                    .catch((error) => {
                      logsChannel.send(
                        "Error: Setting the category of channel. \n " + error
                      );
                    });

                  // I'm editing permission for the second time because Discord can be buggy.
                  await createdChannel.permissionOverwrites.edit(
                    interaction.user.id,
                    {
                      VIEW_CHANNEL: true,
                    }
                  );

                  logsChannel.send(
                    functions.randomSend({
                      path: "channelCreated_RA",
                      values: {
                        createdChannel: createdChannel.id,
                        user: interaction.user.id,
                        approved: i.user.id,
                      },
                    })
                  );
                  interaction.user
                    .send(
                      functions.randomSend({
                        path: "userAddNotify",
                        values: {
                          user: interaction.user.id,
                          project: createdChannel,
                        },
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
              functions.randomSend({
                path: "requestAddRejected",
                values: {
                  channel: projectName,
                  user: interaction.user.id,
                  approved: i.user.id,
                },
              })
            );
            interaction.user
              .send(
                functions.randomSend({
                  path: "requestAddRejectedDM",
                  values: {
                    channel: projectName,
                  },
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

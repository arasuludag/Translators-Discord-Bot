const {
  SlashCommandBuilder,
  ButtonBuilder,
  ActionRowBuilder,
} = require("discord.js");
const {
  findChannelByID,
  discordStyleProjectName,
  findChannel,
  findCategoryByName,
} = require("../functions.js");
const { PermissionFlagsBits } = require("discord.js");
const { replyEmbed, sendEmbed, updateEmbed } = require("../customSend.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("addme")
    .setDescription("Request admins to add you to a certain project channel.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("manual")
        .setDescription(
          "Request admins to add you to a certain project channel."
        )
        .addStringOption((option) =>
          option
            .setName("project_name")
            .setDescription("Name of the project. Beware of typos!")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("additional_info")
            .setDescription("Why?")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("sass")
        .setDescription("Add yourself to a certain project thread.")
        .addStringOption((option) =>
          option
            .setName("project_name")
            .setDescription("Name of the project. Beware of typos!")
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
  async execute(interaction) {
    const logsChannel = findChannelByID(interaction, process.env.LOGSCHANNELID);
    const channelName = interaction.options.getString("project_name");
    const additionalInfo = interaction.options.getString("additional_info");

    let projectName;
    try {
      projectName = discordStyleProjectName(channelName);
    } catch (error) {
      await replyEmbed(interaction, {
        path: "enterProperName",
        ephemeral: true,
      });
      return;
    }

    // Confirm button.
    const button = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(interaction.user + interaction.id)
        .setLabel("Confirm")
        .setStyle("Success")
    );

    if (interaction.options.getSubcommand() === "manual") {
      await manualAdd(
        interaction,
        projectName,
        button,
        logsChannel,
        additionalInfo
      );
    } else {
      await sassAdd(interaction, projectName, button, logsChannel);
    }
  },
};

async function manualAdd(
  interaction,
  projectName,
  button,
  logsChannel,
  additionalInfo
) {
  const isPlint = await interaction.member.roles.cache.some(
    (role) => role.name === "Plint"
  );

  if (isPlint) {
    await replyEmbed(interaction, {
      path: "addMePrompt",
      values: {
        projectName: projectName,
      },
      components: [button],
      ephemeral: true,
    }).then(() => {
      const filter = (i) =>
        i.customId === interaction.user + interaction.id &&
        i.user.id === interaction.user.id;

      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        max: 1,
        time: 300000,
      });

      collector.on("collect", async (i) => {
        updateEmbed(i, {
          path: "requestAcquired",
          ephemeral: true,
          components: [],
        });

        const foundChannel = await findChannel(interaction, projectName);
        if (foundChannel) {
          foundChannel.permissionOverwrites.edit(interaction.user.id, {
            ViewChannel: true,
          });

          sendEmbed(logsChannel, {
            path: "channelExisted",
            values: {
              user: interaction.user.id,
              project: foundChannel.id,
            },
          });
        } else {
          await interaction.guild.channels
            .create({
              name: projectName,
              type: 0,
              permissionOverwrites: [
                {
                  id: interaction.guild.id,
                  deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                  id: interaction.user.id,
                  allow: [PermissionFlagsBits.ViewChannel],
                },
              ],
            })
            .then(async (createdChannel) => {
              const category = await findCategoryByName(
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

              sendEmbed(logsChannel, {
                path: "channelCreated",
                values: {
                  createdChannel: createdChannel.id,
                },
              });

              sendEmbed(logsChannel, {
                path: "channelExisted",
                values: {
                  user: interaction.user.id,
                  project: createdChannel.id,
                },
              });
            });
        }
      });
    });
  } else {
    const approvalChannel = findChannel(
      interaction,
      process.env.AWAITINGAPPROVALSCHANNELNAME
    );

    await sendEmbed(interaction.user, {
      path: "waitApproval",
      values: {
        project: projectName,
      },
    });

    await replyEmbed(interaction, {
      path: "requestAcquired",
      ephemeral: true,
    });

    const acceptButtonID = "Accept " + interaction.id;
    const rejectPNButtonID = "RejectPN " + interaction.id;
    const rejectAIButtonID = "RejectAI " + interaction.id;
    const rejectNWPButtonID = "RejectNWP " + interaction.id;

    const acceptButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(acceptButtonID)
        .setLabel("Approve")
        .setStyle("Success")
    );
    const rejectPNButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(rejectPNButtonID)
        .setLabel("Reject - Project Name")
        .setStyle("Danger")
    );
    const rejectAIButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(rejectAIButtonID)
        .setLabel("Reject - Additional Info")
        .setStyle("Danger")
    );
    const rejectNWPButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(rejectNWPButtonID)
        .setLabel("Reject - Not Working on the Project")
        .setStyle("Danger")
    );

    let foundChannel = await findChannel(interaction, projectName);

    await sendEmbed(approvalChannel, {
      path: "addRequest",
      values: {
        user: interaction.user.id,
        projectName: foundChannel ? `<#${foundChannel.id}>` : projectName,
        additionalInfo: additionalInfo,
      },
      components: [
        acceptButton,
        rejectPNButton,
        rejectAIButton,
        rejectNWPButton,
      ],
    }).then((replyMessage) => {
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

        if (i.customId === acceptButtonID) {
          // I'm double checking because if the channel didn't exist when the request was made,
          // it doesn't mean that it still doesn't exist when someone approves the request.
          foundChannel = await findChannel(interaction, projectName);

          if (foundChannel) {
            foundChannel.permissionOverwrites.edit(interaction.user.id, {
              ViewChannel: true,
            });

            sendEmbed(logsChannel, {
              path: "channelExisted_RA",
              values: {
                user: interaction.user.id,
                project: foundChannel.id,
                approved: i.user.id,
              },
            });
            sendEmbed(interaction.user, {
              path: "userAddNotify",
              values: {
                project: foundChannel.id,
              },
            });
          } else {
            interaction.guild.channels
              .create({
                name: projectName,
                type: 0,
                permissionOverwrites: [
                  {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                  },
                  {
                    id: interaction.user.id,
                    allow: [PermissionFlagsBits.ViewChannel],
                  },
                ],
              })
              .then(async (createdChannel) => {
                const category = await findCategoryByName(
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

                sendEmbed(logsChannel, {
                  path: "channelCreated_RA",
                  values: {
                    createdChannel: createdChannel.id,
                  },
                });

                sendEmbed(logsChannel, {
                  path: "channelExisted_RA",
                  values: {
                    user: interaction.user.id,
                    project: createdChannel.id,
                    approved: i.user.id,
                  },
                });

                sendEmbed(interaction.user, {
                  path: "userAddNotify",
                  values: {
                    user: interaction.user.id,
                    project: createdChannel,
                  },
                });
              })
              .catch((error) => {
                logsChannel.send("Error. ", error);
              });
          }
        } else {
          let reason = "";

          switch (i.customId) {
            case rejectPNButtonID:
              reason = "Project Name";
              break;

            case rejectAIButtonID:
              reason = "Additional Info";
              break;

            case rejectNWPButtonID:
              reason = "Not Working on the Project";
              break;

            default:
              break;
          }

          sendEmbed(logsChannel, {
            path: "requestAddRejected",
            values: {
              channel: projectName,
              user: interaction.user.id,
              approved: i.user.id,
              reason: reason,
            },
          });
          sendEmbed(interaction.user, {
            path: "requestAddRejectedDM",
            values: {
              channel: projectName,
              reason: reason,
            },
          });
        }
      });
    });
  }
}

async function sassAdd(interaction, projectName, button, logsChannel) {
  await replyEmbed(interaction, {
    path: "addMePromptThread",
    values: {
      projectName: projectName,
    },
    ephemeral: true,
    components: [button],
  });

  const filter = (i) => i.customId === interaction.user + interaction.id;

  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    max: 1,
    time: 300000,
  });

  collector.on("collect", async (i) => {
    // Changes the message to acknowledge button press.
    await updateEmbed(i, { path: "requestAcquired", components: [] });

    const channel = await findChannelByID(
      interaction,
      process.env.PROJECTCHANNELREQUESTSCHANNELID
    );

    // If someone tries to create thread under a thread, return.
    if (channel.isThread() || !channel.type === 0) {
      // If someone tries to create a thread, under a thread.
      sendEmbed(interaction.user, "setParentError");
      return;
    }

    // Find thread.
    let thread = await channel.threads.cache.find(
      (x) => x.name === projectName
    );

    // If thread cannot be found, look at the archived ones.
    if (!thread) {
      let archivedThreads = await interaction.channel.threads?.fetchArchived();
      thread = await archivedThreads?.threads.find(
        (x) => x.name === projectName
      );
    }

    // If thread exists, add the person.
    if (thread) {
      await thread.setArchived(false); // unarchive if archived.

      await thread.members.add(interaction.user.id);

      await sendEmbed(interaction.user, {
        path: "userAddNotify",
        values: {
          project: thread.id,
        },
      });

      await sendEmbed(logsChannel, {
        path: "buddyUpLog",
        values: {
          thread: thread.id,
          user: interaction.user.id,
        },
      });

      return;
    }

    // If thread doesn't exists, create and add the person.
    await channel.threads
      .create({
        name: projectName,
        autoArchiveDuration: 10080,
        type: process.env.THREADTYPE,
        reason: "For " + interaction.options.getString("for"),
      })
      .then(async (thread) => {
        if (thread.joinable) await thread.join();
        await thread.members.add(interaction.user.id);

        await sendEmbed(interaction.user, {
          path: "userAddNotify",
          values: {
            project: thread.id,
          },
        });

        await sendEmbed(logsChannel, {
          path: "buddyUpLog",
          values: {
            thread: thread.id,
            user: interaction.user.id,
          },
        });

        await sendEmbed(channel, {
          path: "threadCreated",
          values: {
            thread: interaction.options.getString("for"),
            user: interaction.user.id,
          },
        });
      });
  });
}

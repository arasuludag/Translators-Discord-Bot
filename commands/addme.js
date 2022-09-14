const { SlashCommandBuilder } = require("@discordjs/builders");
const { ButtonBuilder, ActionRowBuilder } = require("discord.js");
const functions = require("../functions.js");
const { PermissionFlagsBits } = require("discord.js");

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
            .setName("for")
            .setDescription("Name of the project. Beware of typos!")
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    if (interaction.options.getSubcommand() === "manual") {
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

      const isMod = await interaction.member.roles.cache.some(
        (role) => role.id === process.env.MODROLEID
      );

      if (isMod) {
        const button = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(interaction.user + interaction.id)
            .setLabel("Confirm")
            .setStyle("Success")
        );

        await interaction
          .reply(
            functions.randomSend({
              path: "addMePrompt",
              values: {
                projectName: projectName,
              },
              components: [button],
              ephemeral: true,
            })
          )
          .then(() => {
            const filter = (i) =>
              i.customId === interaction.user + interaction.id &&
              i.user.id === interaction.user.id;

            const collector =
              interaction.channel.createMessageComponentCollector({
                filter,
                max: 1,
                time: 300000,
              });

            collector.on("collect", async (i) => {
              i.update(
                functions.randomSend({
                  path: "requestAcquired",
                  ephemeral: true,
                  components: [],
                })
              );

              const foundChannel = await functions.findChannel(
                interaction,
                projectName
              );
              if (foundChannel) {
                foundChannel.permissionOverwrites.edit(interaction.user.id, {
                  ViewChannel: true,
                });

                logsChannel.send(
                  functions.randomSend({
                    path: "channelExisted",
                    values: {
                      user: interaction.user.id,
                      project: foundChannel.id,
                    },
                  })
                );
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

                    logsChannel.send(
                      functions.randomSend({
                        path: "channelCreated",
                        values: {
                          createdChannel: createdChannel.id,
                          user: interaction.user.id,
                        },
                      })
                    );
                  });
              }
            });
          });
      } else {
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

        const acceptButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(acceptButtonCustomID)
            .setLabel("Approve")
            .setStyle("Success")
        );
        const rejectButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(rejectButtonCustomID)
            .setLabel("Reject")
            .setStyle("Danger")
        );

        let foundChannel = await functions.findChannel(
          interaction,
          projectName
        );

        await approvalChannel
          .send(
            functions.randomSend({
              path: "addRequest",
              values: {
                user: interaction.user.id,
                projectName: foundChannel
                  ? `<#${foundChannel.id}>`
                  : projectName,
                additionalInfo: additionalInfo,
              },
              components: [acceptButton, rejectButton],
            })
          )
          .then((replyMessage) => {
            const filter = (i) => interaction.id === i.customId.split(" ")[1];

            const collector =
              replyMessage.channel.createMessageComponentCollector({
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
                    ViewChannel: true,
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
                      const category = await functions.findCategoryByName(
                        interaction,
                        process.env.PROJECTSCATEGORY
                      );
                      await createdChannel
                        .setParent(category.id, { lockPermissions: false })
                        .catch((error) => {
                          logsChannel.send(
                            "Error: Setting the category of channel. \n " +
                              error
                          );
                        });

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
      }
    } else {
      let projectName;
      try {
        projectName = functions.discordStyleProjectName(
          interaction.options.getString("for")
        );
      } catch (error) {
        await interaction.reply(
          functions.randomSend({
            path: "enterProperName",
            ephemeral: true,
          })
        );
        return;
      }

      const logsChannel = await functions.findChannelByID(
        interaction,
        process.env.LOGSCHANNELID
      );

      // Create the button. Button needs a custom ID.
      const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(interaction.user + interaction.id)
          .setLabel("Confirm")
          .setStyle("Success")
      );

      await interaction.reply(
        functions.randomSend({
          path: "addMePromptThread",
          values: {
            projectName: projectName,
          },
          ephemeral: true,
          components: [button],
        })
      );

      const filter = (i) => i.customId === interaction.user + interaction.id;

      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        max: 1,
        time: 300000,
      });

      collector.on("collect", async (i) => {
        // Changes the message to acknowledge button press.
        await i.update(
          functions.randomSend({ path: "requestAcquired", components: [] })
        );

        const channel = await functions.findChannelByID(
          interaction,
          process.env.PROJECTCHANNELREQUESTSCHANNELID
        );

        // If someone tries to create thread under a thread, return.
        if (channel.isThread() || !channel.type === 0) {
          // If someone tries to create a thread, under a thread.
          interaction.user
            .send(functions.randomSend("setParentError"))
            .catch(() => {
              console.error("Failed to send DM");
            });
          return;
        }

        // Find thread.
        let thread = await channel.threads.cache.find(
          (x) => x.name === projectName
        );

        // If thread cannot be found, look at the archived ones.
        if (!thread) {
          let archivedThreads =
            await interaction.channel.threads?.fetchArchived();
          thread = await archivedThreads?.threads.find(
            (x) => x.name === projectName
          );
        }

        // If thread exists, add the person.
        if (thread) {
          await thread.setArchived(false); // unarchive if archived.

          await thread.members.add(interaction.user.id);

          await interaction.user
            .send(
              functions.randomSend({
                path: "userAddNotify",
                values: {
                  project: thread.id,
                },
              })
            )
            .catch(() => {
              console.error("Failed to send DM");
            });

          await logsChannel.send(
            functions.randomSend({
              path: "buddyUpLog",
              values: {
                thread: thread.id,
                user: interaction.user.id,
              },
            })
          );

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

            await interaction.user
              .send(
                functions.randomSend({
                  path: "userAddNotify",
                  values: {
                    project: thread.id,
                  },
                })
              )
              .catch(() => {
                console.error("Failed to send DM");
              });

            await logsChannel.send(
              functions.randomSend({
                path: "buddyUpLog",
                values: {
                  thread: thread.id,
                  user: interaction.user.id,
                },
              })
            );

            await channel.send(
              functions.randomSend({
                path: "threadCreated",
                values: {
                  thread: interaction.options.getString("for"),
                  user: interaction.user.id,
                },
              })
            );
          });
      });
    }
  },
};

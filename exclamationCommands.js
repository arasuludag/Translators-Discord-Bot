const translation = require("./data.json");
const i18next = require("i18next");
const fs = require("fs");
const { Permissions } = require("discord.js");
const {
  modRole,
  projectsCategory,
  sassAlertChannelID,
  suppAlertChannelID,
  archiveCategory,
  logsChannelName,
  announcementsChannelName,
  generalChannelID,
  embedColor,
} = require("./config.json");
const functions = require("./functions.js");
const backup = require("discord-backup");

// For localization.
i18next.init({
  lng: "en",
  preload: true,
  resources: {
    en: {
      translation,
    },
  },
});

module.exports = {
  commands: async (message, client) => {
    // Discord caused a crash by sending a non-existent message that doesn't have a role attribute and that caused a crash.
    // So that's why.
    let isMod = false;
    try {
      isMod = message.member.roles.cache.some((role) => role.name === modRole);
    } catch (error) {
      await message.channel
        .send(functions.randomText("discordError", {}))
        .catch((error) => {
          console.log(error);
        });
      return;
    }

    // Extracts the first word of message to check for commands later.
    const messageFirstWord = message.content.split(" ")[0];

    switch (true) {
      // When !announcement is used, bot relays the message to announcement channel.
      case messageFirstWord === "!announcement" && isMod:
        await functions.findChannel(message, announcementsChannelName).send({
          embeds: [
            {
              color: embedColor,
              title: "Announcement",
              description: message.content.substring(
                message.content.indexOf(" ") + 1
              ),
            },
          ],
        });
        break;

      // A basic reminder.
      case messageFirstWord === "!remindme" && isMod:
        {
          const splitMessage = message.content
            .substring(message.content.indexOf(" ") + 1)
            .split(" | ");

          const mentionedChannel = await message.mentions.channels;

          if (
            splitMessage[0] === "!remindme" ||
            !splitMessage[1] ||
            !splitMessage[2] ||
            !mentionedChannel.keys().next().value
          ) {
            await message.reply(functions.randomText("reminder.help", {}));
            return;
          }

          const remindText = splitMessage[0];
          const unixTimeWhen = Date.parse(splitMessage[1]);

          if (isNaN(unixTimeWhen)) {
            return message.reply(functions.randomText("reminder.notADate", {}));
          }

          const differenceBetween = unixTimeWhen - Date.now();
          if (differenceBetween < 0) {
            return message.reply(
              functions.randomText("reminder.enteredPastDate", {})
            );
          }

          if (!Number.isInteger(parseInt(splitMessage[2]))) {
            return message.reply(functions.randomText("reminder.notAnInt", {}));
          }

          await message.react("⏳");

          let timeLeftTimeout = [];
          let timeCameTimeout = [];

          mentionedChannel.map(async (value, index) => {
            await value.send(
              functions.randomText(
                "reminder.initiated",
                {
                  event: remindText,
                  time: `<t:${unixTimeWhen / 1000}> (<t:${
                    unixTimeWhen / 1000
                  }:R>)`,
                  before: splitMessage[2],
                },
                undefined,
                undefined,
                undefined,
                "@everyone"
              )
            );

            timeLeftTimeout[index] = setTimeout(
              () =>
                value.send(
                  functions.randomText(
                    "reminder.minutesLeft",
                    {
                      minutesBefore: splitMessage[2],
                      remindText: remindText,
                    },
                    undefined,
                    undefined,
                    undefined,
                    "@everyone"
                  )
                ),
              differenceBetween - splitMessage[2] * 60 * 1000
            );
            timeCameTimeout[index] = setTimeout(
              () =>
                value.send(
                  functions.randomText(
                    "reminder.itsTime",
                    {
                      remindText: remindText,
                    },
                    undefined,
                    undefined,
                    undefined,
                    "@everyone"
                  )
                ),
              differenceBetween
            );
          });

          const filter = (reaction, user) =>
            reaction.emoji.name === "❌" && !user.bot;

          const collector = message.createReactionCollector({
            filter,
            time: differenceBetween,
            max: 1,
          });

          collector.on("collect", async () => {
            message.react("❌");

            mentionedChannel.map(async (value, index) => {
              clearTimeout(timeLeftTimeout[index]);
              clearTimeout(timeCameTimeout[index]);

              await value.send(
                functions.randomText("reminder.canceled", {
                  event: remindText,
                })
              );
            });
          });
        }
        break;

      // Stats for member count. Has issues.
      case messageFirstWord === "!stats" && isMod:
        {
          let memberCountMessage = "";

          message.guild.roles.cache.forEach((role) => {
            memberCountMessage = memberCountMessage.concat(
              `${role.toString()} has ${
                message.guild.roles.cache.get(role.id).members.size
              } people.
`
            );
          });
          message.reply(`We have ${message.member.guild.memberCount} members in total. 
${memberCountMessage} 
`);
        }
        break;

      // Counts the members in spesified role. Has issues.
      case messageFirstWord === "!list" && isMod:
        {
          const mentionedRolesMap = message.mentions.roles;
          mentionedRolesMap.map((values) => {
            let memberList = "";
            values.members.map((role) => {
              memberList = memberList.concat(
                `${role.user.toString()}
`
              );
            });
            message.reply(`${values.toString()} has 
${memberList}`);
          });
        }
        break;

      // Adds several users to several channels. !add username username channelname channelname
      case messageFirstWord === "!add" && isMod:
        {
          const logsChannel = await functions.findChannel(
            message,
            logsChannelName
          );

          const mentionedChannel = message.mentions.channels;
          const mentionedMembersMap = message.mentions.members;

          if (mentionedChannel.keys()) {
            mentionedMembersMap
              .filter((value) => !value.user.bot)
              .map((value, key) => {
                mentionedChannel.map(async (valueChannel, keyChannel) => {
                  try {
                    await valueChannel.permissionOverwrites.edit(key, {
                      VIEW_CHANNEL: true,
                    });
                  } catch (error) {
                    await message.author.send(
                      functions.randomText("setParentError", {})
                    );
                    return;
                  }

                  await logsChannel.send(
                    functions.randomText("channelExisted_RA", {
                      user: value.user.id,
                      project: keyChannel,
                      approved: message.author.id,
                    })
                  );
                  await value.user.send(
                    functions
                      .randomText("userAddNotify", {
                        project: keyChannel,
                      })
                      .catch(() => {
                        console.error("Failed to send DM");
                      })
                  );
                });
              });
            message.delete();
          }
        }
        break;

      // Removes people from several channels. !remove username username channelname channelname
      case messageFirstWord === "!remove" && isMod:
        {
          const logsChannel = await functions.findChannel(
            message,
            logsChannelName
          );

          const mentionedChannel = message.mentions.channels;
          const mentionedMembersMap = message.mentions.members;

          if (mentionedChannel.keys()) {
            mentionedMembersMap
              .filter((value) => !value.user.bot)
              .map((value, key) => {
                mentionedChannel.map(async (valueChannel, keyChannel) => {
                  try {
                    await valueChannel.permissionOverwrites.edit(key, {
                      VIEW_CHANNEL: false,
                    });
                  } catch (error) {
                    await message.author.send(
                      functions.randomText("setParentError", {})
                    );
                    return;
                  }

                  await logsChannel.send(
                    functions.randomText("removedFromChannel", {
                      user: value.user.id,
                      project: keyChannel,
                      approved: message.author.id,
                    })
                  );
                });
              });
            message.delete();
          }
        }
        break;

      // Is there a channel with this name?
      case messageFirstWord === "!isthere" && isMod:
        {
          const logsChannel = await functions.findChannel(
            message,
            logsChannelName
          );
          const projectName = message.content.substring(
            message.content.indexOf(" ") + 1
          );
          const foundChannel = await functions.findChannel(
            message,
            functions.discordStyleProjectName(projectName)
          );
          if (foundChannel) {
            message
              .reply(
                functions.randomText("isThere.yes", {
                  foundChannel: foundChannel.id,
                })
              )
              .then((replyMessage) => {
                replyMessage.react("👍");

                const filter = (reaction, user) => {
                  return (
                    reaction.emoji.name === "👍" &&
                    user.id === message.author.id
                  );
                };
                const collector = replyMessage.createReactionCollector({
                  filter,
                  time: 60000,
                  max: 1,
                });

                collector.on("collect", async () => {
                  await foundChannel.permissionOverwrites.edit(
                    message.author.id,
                    {
                      VIEW_CHANNEL: true,
                    }
                  );

                  logsChannel.send(
                    functions.randomText("channelExisted", {
                      user: message.author.id,
                      project: foundChannel.id,
                    })
                  );
                });
              });
          } else {
            message
              .reply(functions.randomText("isThere.no", {}))
              .then((replyMessage) => {
                replyMessage.react("👍");
                replyMessage.react("👎");

                const filter = (reaction, user) => {
                  return (
                    reaction.emoji.name === "👍" &&
                    user.id === message.author.id
                  );
                };
                const collector = replyMessage.createReactionCollector({
                  filter,
                  time: 60000,
                  max: 1,
                });

                collector.on("collect", async () => {
                  await message.guild.channels
                    .create(projectName, {
                      type: "GUILD_TEXT",
                      permissionOverwrites: [
                        {
                          id: message.guild.id,
                          deny: [Permissions.FLAGS.VIEW_CHANNEL],
                        },
                        {
                          id: message.author.id,
                          allow: [Permissions.FLAGS.VIEW_CHANNEL],
                        },
                      ],
                    })
                    .then(async (createdChannel) => {
                      const category = await functions.findCategoryByName(
                        message,
                        projectsCategory
                      );
                      await createdChannel.setParent(category.id);

                      await createdChannel.permissionOverwrites.edit(
                        message.author.id,
                        {
                          VIEW_CHANNEL: true,
                        }
                      );

                      logsChannel.send(
                        functions.randomText("channelCreated", {
                          createdChannel: createdChannel.id,
                          user: message.author.id,
                        })
                      );
                    })
                    .catch(console.error);
                });
                collector.on("end", () => {
                  setTimeout(() => {
                    message.delete();
                    replyMessage.delete();
                  }, 3000);
                });
              });
          }
        }
        break;

      // Add me to this channel. "!addme channel-name"
      case messageFirstWord === "!addme" && isMod:
        {
          const logsChannel = await functions.findChannel(
            message,
            logsChannelName
          );

          const projectName = message.content.substring(
            message.content.indexOf(" ") + 1
          );
          if (projectName === "!addme") {
            await message.reply(functions.randomText("addMePromptEmpty", {}));
            break;
          }
          await message
            .reply(
              functions.randomText("addMePrompt", {
                projectName: projectName,
              })
            )
            .then((replyMessage) => {
              const filter = (reaction, user) => {
                return (
                  reaction.emoji.name === "👍" && user.id === message.author.id
                );
              };
              const collector = replyMessage.createReactionCollector({
                filter,
                time: 60000,
                max: 1,
              });

              collector.on("collect", async () => {
                const foundChannel = await functions.findChannel(
                  message,
                  functions.discordStyleProjectName(projectName)
                );
                if (foundChannel) {
                  foundChannel.permissionOverwrites.edit(message.author.id, {
                    VIEW_CHANNEL: true,
                  });

                  logsChannel.send(
                    functions.randomText("channelExisted", {
                      user: message.author.id,
                      project: foundChannel.id,
                    })
                  );
                } else {
                  await message.guild.channels
                    .create(projectName, {
                      type: "GUILD_TEXT",
                      permissionOverwrites: [
                        {
                          id: message.guild.id,
                          deny: [Permissions.FLAGS.VIEW_CHANNEL],
                        },
                        {
                          id: message.author.id,
                          allow: [Permissions.FLAGS.VIEW_CHANNEL],
                        },
                      ],
                    })
                    .then(async (createdChannel) => {
                      const category = await functions.findCategoryByName(
                        message,
                        projectsCategory
                      );
                      await createdChannel.setParent(category.id);

                      await createdChannel.permissionOverwrites.edit(
                        message.author.id,
                        {
                          VIEW_CHANNEL: true,
                        }
                      );

                      logsChannel.send(
                        functions.randomText("channelCreated", {
                          createdChannel: createdChannel.id,
                          user: message.author.id,
                        })
                      );
                    })
                    .catch(console.error);
                }
              });
              collector.on("end", () => {
                replyMessage.delete();
                message.delete();
              });
            });
        }
        break;

      // Add a funfact to the JSON file.
      case messageFirstWord === "!addfunfact" && isMod:
        if (!message.content.split(" ")[1]) {
          await message.reply(functions.randomText("addFunfact.empty", {}));
          break;
        }

        fs.readFile(
          "./funfacts.json",
          "utf8",
          function readFileCallback(err, data) {
            if (err) {
              console.log(err);
            } else {
              let obj = JSON.parse(data); // now it an object
              obj.funfacts.push(
                message.content.substring(message.content.indexOf(" ") + 1)
              ); // add some data
              const json = JSON.stringify(obj); // convert it back to json
              fs.writeFile("./funfacts.json", json, "utf8", async () => {
                await message.reply(
                  functions.randomText("addFunfact.added", {
                    funfact: message.content.substring(
                      message.content.indexOf(" ") + 1
                    ),
                  })
                );
              }); // write it back
            }
          }
        );

        break;

      // Archive the channel.
      case messageFirstWord === "!archive" && isMod:
        {
          const logsChannel = await functions.findChannel(
            message,
            logsChannelName
          );

          const category = functions.findCategoryByName(
            message,
            archiveCategory
          );

          try {
            message.channel.setParent(category.id, { lockPermissions: false });
          } catch (error) {
            await message.author.send(
              functions.randomText("setParentError", {})
            );
            return;
          }

          await message.channel.send(
            functions.randomText("movedToWO_User", {
              channel: message.channel.id,
            })
          );

          await logsChannel.send(
            functions.randomText("movedToArchive", {
              user: message.author.id,
              channel: message.channel.id,
            })
          );
          await message.delete();
        }
        break;

      // Archive the channel.
      case messageFirstWord === "!unarchive" && isMod:
        {
          const logsChannel = await functions.findChannel(
            message,
            logsChannelName
          );

          const category = functions.findCategoryByName(
            message,
            projectsCategory
          );
          try {
            message.channel.setParent(category.id, { lockPermissions: false });
          } catch (error) {
            await message.author.send(
              functions.randomText("setParentError", {})
            );
            return;
          }

          await message.channel.send(
            functions.randomText("movedFromWO_User", {
              channel: message.channel.id,
            })
          );

          await logsChannel.send(
            functions.randomText("movedFromArchive", {
              user: message.author.id,
              channel: message.channel.id,
            })
          );
          await message.delete();
        }
        break;

      // Delete last messages. To delete last 10, !delete 10
      case messageFirstWord === "!delete" && isMod:
        {
          const logsChannel = await functions.findChannel(
            message,
            logsChannelName
          );
          const howMany = parseInt(
            message.content.substring(message.content.indexOf(" ") + 1)
          );

          if (Number.isInteger(howMany) && howMany < 101) {
            // Bulk delete messages
            message.channel
              .bulkDelete(howMany)
              .then(
                async (messages) =>
                  await logsChannel.send(
                    functions.randomText("deletedMessages", {
                      user: message.author.id,
                      channel: message.channel.id,
                      howMany: messages.size,
                    })
                  )
              )
              .catch(console.error);
          }
        }
        break;

      // Send message to a channel as bot.
      case messageFirstWord === "!sendmessage" && isMod:
        {
          const mentionedChannel = message.mentions.channels;

          const splitMessage = message.content
            .substring(message.content.indexOf(" ") + 1)
            .split(" | ");

          if (mentionedChannel && splitMessage[1] && splitMessage[2]) {
            mentionedChannel.map((value) => {
              value
                .send({
                  embeds: [
                    {
                      color: embedColor,
                      title: splitMessage[1],
                      description: splitMessage[2],
                    },
                  ],
                })
                .catch(console.error);
            });
          }
        }
        break;

      // Move message to another channel.
      case messageFirstWord === "!moveto" && isMod:
        {
          if (message.reference && message.mentions.channels) {
            const repliedMessage = await message.channel.messages.fetch(
              message.reference.messageId
            );
            const mentionedUser = message.mentions.repliedUser;
            const attachment = Array.from(repliedMessage.attachments.values());
            const mentionedUserNickname = message.guild.members.cache.find(
              (a) => a.user === mentionedUser
            ).nickname;

            const channelMovedTo = message.mentions.channels;
            channelMovedTo.map((value) => {
              value.send({
                embeds: [
                  {
                    color: embedColor,
                    author: {
                      name: mentionedUserNickname
                        ? mentionedUserNickname
                        : mentionedUser.username,
                      icon_url: `https://cdn.discordapp.com/avatars/${mentionedUser.id}/${mentionedUser.avatar}.png?size=256`,
                    },
                    description: repliedMessage.content,
                    image: {
                      url:
                        attachment[0] &&
                        (attachment[0].name.includes(".jpg") ||
                          attachment[0].name.includes(".png") ||
                          attachment[0].name.includes(".gif"))
                          ? attachment[0].url
                          : undefined,
                    },
                  },
                ],
                files:
                  attachment[0] &&
                  !(
                    attachment[0].name.includes(".jpg") ||
                    attachment[0].name.includes(".png") ||
                    attachment[0].name.includes(".gif")
                  )
                    ? [
                        {
                          attachment: attachment[0].url,
                        },
                      ]
                    : undefined,
              });

              mentionedUser
                .send(
                  functions.randomText("messageMovedTo", {
                    message: repliedMessage.content,
                    channel: value.id,
                    attachment: attachment[0] ? attachment[0].url : " ",
                  })
                )
                .catch(() => {
                  console.error("Failed to send DM");
                });
            });

            repliedMessage.delete();
            message.delete();
          }
        }
        break;

      // Copy message to another channel.
      case messageFirstWord === "!copyto" && isMod:
        {
          if (message.reference && message.mentions.channels) {
            const repliedMessage = await message.channel.messages.fetch(
              message.reference.messageId
            );
            const mentionedUser = message.mentions.repliedUser;
            const attachment = Array.from(repliedMessage.attachments.values());
            const mentionedUserNickname = message.guild.members.cache.find(
              (a) => a.user === mentionedUser
            ).nickname;

            const channelMovedTo = message.mentions.channels;
            channelMovedTo.map((value) => {
              value.send({
                embeds: [
                  {
                    color: embedColor,
                    author: {
                      name: mentionedUserNickname
                        ? mentionedUserNickname
                        : mentionedUser.username,
                      icon_url: `https://cdn.discordapp.com/avatars/${mentionedUser.id}/${mentionedUser.avatar}.png?size=256`,
                    },
                    description: repliedMessage.content,
                    image: {
                      url:
                        attachment[0] &&
                        (attachment[0].name.includes(".jpg") ||
                          attachment[0].name.includes(".png") ||
                          attachment[0].name.includes(".gif"))
                          ? attachment[0].url
                          : undefined,
                    },
                  },
                ],
                files:
                  attachment[0] &&
                  !(
                    attachment[0].name.includes(".jpg") ||
                    attachment[0].name.includes(".png") ||
                    attachment[0].name.includes(".gif")
                  )
                    ? [
                        {
                          attachment: attachment[0].url,
                        },
                      ]
                    : undefined,
              });

              mentionedUser
                .send(
                  functions.randomText("messageCopiedTo", {
                    message: repliedMessage.content,
                    channel: value.id,
                    attachment: attachment[0] ? attachment[0].url : " ",
                  })
                )
                .catch(() => {
                  console.error("Failed to send DM");
                });
            });

            message.delete();
          }
        }
        break;

      // Manages the alert channel by asking author if this is what they wanted.
      case (message.channel.id === sassAlertChannelID ||
        message.channel.id === suppAlertChannelID) &&
        !message.author.bot &&
        message.attachments.size === 0:
        {
          const generalChannel = await functions.findChannelByID(
            message,
            generalChannelID
          );
          message
            .reply(
              functions.randomText("isThisAlert", { general: generalChannel })
            )
            .then((replyMessage) => {
              let reacted = false;
              replyMessage.react("👍");
              replyMessage.react("👎");
              replyMessage.react("❌");

              const filter = (reaction, user) => {
                return (
                  (reaction.emoji.name === "👍" ||
                    reaction.emoji.name === "👎" ||
                    reaction.emoji.name === "❌") &&
                  user.id === message.author.id &&
                  !user.bot
                );
              };

              const collector = replyMessage.createReactionCollector({
                filter,
                time: 60000,
                max: 1,
              });

              collector.on("collect", (reaction) => {
                switch (reaction.emoji.name) {
                  case "👍":
                    reacted = true;
                    replyMessage.delete();
                    break;

                  case "👎": {
                    reacted = true;

                    const mentionedUserNickname =
                      message.guild.members.cache.find(
                        (a) => a.user === message.author
                      ).nickname;

                    generalChannel.send(
                      functions.randomText(
                        "saidInAlertChannel",
                        {
                          user: message.author.id,
                          message: message.content,
                        },
                        undefined,
                        mentionedUserNickname
                          ? mentionedUserNickname
                          : message.author.username,
                        `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=256`
                      )
                    );
                    setTimeout(() => {
                      message.delete();
                      replyMessage.delete();
                    }, 3000);

                    return;
                  }
                }
              });

              collector.on("end", () => {
                if (!reacted) {
                  message.delete();
                  replyMessage.delete();
                }
              });
            });
        }
        break;

      // Backup the server.
      case messageFirstWord === "!backup" && isMod:
        backup.setStorageFolder(__dirname + "/backups/");
        message.react("⏳");
        backup
          .create(message.guild, {
            jsonBeautify: true,
          })
          .then((backupData) => {
            // And send informations to the backup owner
            message.author.send("Backup created: " + backupData.id);
            message.react("💾");
          });
        break;

      case messageFirstWord === "!memory" && isMod:
        {
          const used = process.memoryUsage();
          let response = "";
          for (let key in used) {
            response = response.concat(
              `${key} ${Math.round((used[key] / 1024 / 1024) * 100) / 100} MB\n`
            );
          }
          message.channel.send(response);
        }
        break;
      // ****************************************************** //
      // After this point, it's only for fun.
      case message.mentions.has(client.user) && !message.author.bot:
        message
          .reply(functions.randomText("taggedBot", {}))
          .then((replyMessage) => {
            if (
              replyMessage.embeds[0].description === "Speak, friend, and enter."
            ) {
              const filter = (m) => {
                return m.content.toLowerCase().includes("mellon") === true;
              };

              const collector = message.channel.createMessageCollector({
                filter,
                time: 60000,
                max: 1,
              });

              collector.on("collect", async (reaction) => {
                await reaction.reply(
                  "https://tenor.com/view/lord-of-the-rings-gandalf-indeed-gif-18505269"
                );
              });
            }
          });
        break;

      case message.content === "Hello there!":
        message.reply(
          "https://c.tenor.com/smu7cmwm4rYAAAAd/general-kenobi-kenobi.gif"
        );
        break;

      case message.content.toLowerCase().includes("oh, hi"):
        message.reply(
          "https://c.tenor.com/uATlxJ4eqLsAAAAC/tommy-wiseau-oh-hi-mark.gif"
        );
        break;

      case message.content === "Hmm.":
        message.reply(
          "https://c.tenor.com/SY861GLwsiUAAAAM/the-witcher-geralt.gif"
        );
        break;

      case message.content === "Helle.":
        message.reply(
          "https://tenor.com/view/jason-momoa-jason-momoa-angelwoodgett-gif-18117252"
        );
        break;

      case message.content.toLowerCase().includes("vaco"):
        message.react("💩");
        break;

      case message.content.toLowerCase().includes("toss") &&
        message.content.toLowerCase().includes("coin") &&
        !message.content.includes("http"):
        message.reply(
          "https://tenor.com/view/toss-a-coin-to-your-witcher-o-valley-of-plenty-jaskier-bard-song-gif-15952117"
        );
        break;
    }
  },
};

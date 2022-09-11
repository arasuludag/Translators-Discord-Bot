const { SlashCommandBuilder } = require("@discordjs/builders");
const { ButtonBuilder, ActionRowBuilder } = require("discord.js");
const functions = require("../functions.js");
const i18next = require("i18next");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("usersetup")
    .setDescription("Enter your full name and target language.")
    .addStringOption((option) =>
      option
        .setName("full_name")
        .setDescription("Your full name.")
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("target_language")
        .setDescription("Your target language.")
        .setRequired(true)
    ),
  async execute(interaction) {
    const approvalChannel = await functions.findChannel(
      interaction,
      process.env.AWAITINGAPPROVALSCHANNELNAME
    );
    const logsChannel = await functions.findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );
    const nickName = interaction.options.getString("full_name");
    const role = interaction.options.getRole("target_language");

    await interaction.user
      .send(
        functions.randomSend({
          path: "setup.waitForApproveDM",
          values: {
            nickName: nickName,
            role: role.name,
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

    await approvalChannel
      .send(
        functions.randomSend({
          path: "setup.request",
          values: {
            user: interaction.user.id,
            nickName: nickName,
            role: role.id,
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
            interaction.member.setNickname(nickName).catch(() => {
              interaction.user
                .send(functions.randomSend("setup.error"))
                .catch(() => {
                  console.error("Failed to send DM");
                });
            });
            interaction.member.roles.add(role);

            const roleDTT = interaction.guild.roles.cache.find(
              (r) => r.name === process.env.DTTROLENAME
            );
            interaction.member.roles.add(roleDTT);

            logsChannel.send(
              functions.randomSend({
                path: "setup.accepted",
                values: {
                  user: interaction.user.id,
                  nickName: nickName,
                  role: role.id,
                },
              })
            );
            interaction.user
              .send(
                functions.randomSend({
                  path: "setup.acceptedDM",
                  values: {
                    user: interaction.user.id,
                    nickName: nickName,
                    role: role.name,
                  },
                })
              )
              .catch(() => {
                console.error("Failed to send DM");
              });
            interaction.user
              .send({
                embeds: [
                  {
                    color: process.env.EMBEDCOLOR,
                    title: i18next.t("welcome.title"),
                    description: i18next.t("setup.afterApproval", {
                      discord101: process.env.DISCORD101CHANNELID,
                      channelindex: process.env.CHANNELINDEXCHANNELID,
                      readingspeed: process.env.READINGSPEEDCHANNELID,
                      lmmeetingrecaps: process.env.LMMEETINGRECAPSCHANNELID,
                      general: process.env.GENERALCHANNELID,
                      sassalert: process.env.SASSALERTCHANNELID,
                      supplementalalert: process.env.SUPPALERTCHANNELID,
                      botcommands: process.env.BOTCOMMANDSCHANNELID,
                    }),
                  },
                ],
              })
              .catch(() => {
                console.error("Failed to send DM");
              });
            if (role.name === "new language") {
              logsChannel.send(
                functions.randomSend({
                  path: "setup.newLang",
                  values: {
                    user: interaction.user.id,
                    nickName: nickName,
                    role: role.id,
                  },
                })
              );

              interaction.user
                .send(
                  functions.randomSend({
                    path: "setup.newLangDM",
                    values: {
                      user: interaction.user.id,
                      nickName: nickName,
                      role: role.name,
                    },
                  })
                )
                .catch(() => {
                  console.error("Failed to send DM");
                });
            }
          } else {
            logsChannel.send(
              functions.randomSend({
                path: "setup.rejected",
                values: {
                  user: interaction.user.id,
                  nickName: nickName,
                  role: role.id,
                },
              })
            );
            interaction.user
              .send(
                functions.randomSend({
                  path: "setup.rejectedDM",
                  values: {
                    user: interaction.user.id,
                    reception: process.env.RECEPTIONCHANNELID,
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

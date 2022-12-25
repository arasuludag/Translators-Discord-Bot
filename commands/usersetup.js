const { SlashCommandBuilder } = require("@discordjs/builders");
const { ButtonBuilder, ActionRowBuilder } = require("discord.js");
const { findChannel, findChannelByID } = require("../functions.js");
const i18next = require("i18next");
const { sendEmbed, replyEmbed } = require("../customSend.js");

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
    const approvalChannel = await findChannel(
      interaction,
      process.env.AWAITINGAPPROVALSCHANNELNAME
    );
    const logsChannel = await findChannelByID(
      interaction,
      process.env.LOGSCHANNELID
    );
    const nickName = interaction.options.getString("full_name");
    const role = interaction.options.getRole("target_language");

    await sendEmbed(interaction.user, {
      path: "setup.waitForApproveDM",
      values: {
        nickName: nickName,
        role: role.name,
      },
    });
    await replyEmbed(interaction, { path: "requestAcquired", ephemeral: true });

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

    await sendEmbed(approvalChannel, {
      path: "setup.request",
      values: {
        user: interaction.user.id,
        nickName: nickName,
        role: role.id,
      },
      components: [acceptButton, rejectButton],
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
        if (i.customId === acceptButtonCustomID) {
          interaction.member.setNickname(nickName).catch(() => {
            sendEmbed(interaction.user, "setup.error");
          });
          interaction.member.roles.add(role);

          const roleDTT = interaction.guild.roles.cache.find(
            (r) => r.name === process.env.DTTROLENAME
          );
          interaction.member.roles.add(roleDTT);

          sendEmbed(logsChannel, {
            path: "setup.accepted",
            values: {
              user: interaction.user.id,
              nickName: nickName,
              role: role.id,
            },
          });
          sendEmbed(interaction.user, {
            path: "setup.acceptedDM",
            values: {
              user: interaction.user.id,
              nickName: nickName,
              role: role.name,
            },
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
            sendEmbed(logsChannel, {
              path: "setup.newLang",
              values: {
                user: interaction.user.id,
                nickName: nickName,
                role: role.id,
              },
            });

            sendEmbed(interaction.user, {
              path: "setup.newLangDM",
              values: {
                user: interaction.user.id,
                nickName: nickName,
                role: role.name,
              },
            });
          }
        } else {
          sendEmbed(logsChannel, {
            path: "setup.rejected",
            values: {
              user: interaction.user.id,
              nickName: nickName,
              role: role.id,
            },
          });
          sendEmbed(interaction.user, {
            path: "setup.rejectedDM",
            values: {
              user: interaction.user.id,
              reception: process.env.RECEPTIONCHANNELID,
            },
          });
        }
      });
    });
  },
};

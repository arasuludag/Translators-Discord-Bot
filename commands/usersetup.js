const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageButton, MessageActionRow } = require("discord.js");
const functions = require("../functions.js");
const i18next = require("i18next");
const {
  awaitingApprovalsChannelName,
  logsChannelID,
  dttRoleName,
  discord101ChannelID,
  channelIndexChannelID,
  readingSpeedChannelID,
  lmMeetingRecapsChannelID,
  generalChannelID,
  globalLingSupportChannelID,
  sassAlertChannelID,
  suppAlertChannelID,
  botCommandsChannelID,
  embedColor,
} = require("../config.json");

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
      awaitingApprovalsChannelName
    );
    const logsChannel = await functions.findChannelByID(
      interaction,
      logsChannelID
    );
    const nickName = interaction.options.getString("full_name");
    const role = interaction.options.getRole("target_language");

    await interaction.user
      .send(
        functions.randomText("setup.waitForApproveDM", {
          nickName: nickName,
          role: role.name,
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
          "setup.request",
          {
            user: interaction.user.id,
            nickName: nickName,
            role: role.id,
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
            interaction.member.setNickname(nickName).catch(() => {
              interaction.user
                .send(functions.randomText("setup.error", {}))
                .catch(() => {
                  console.error("Failed to send DM");
                });
            });
            interaction.member.roles.add(role);

            const roleDTT = interaction.guild.roles.cache.find(
              (r) => r.name === dttRoleName
            );
            interaction.member.roles.add(roleDTT);

            logsChannel.send(
              functions.randomText("setup.accepted", {
                user: interaction.user.id,
                nickName: nickName,
                role: role.id,
              })
            );
            interaction.user
              .send(
                functions.randomText("setup.acceptedDM", {
                  user: interaction.user.id,
                  nickName: nickName,
                  role: role.name,
                })
              )
              .catch(() => {
                console.error("Failed to send DM");
              });
            interaction.user
              .send({
                embeds: [
                  {
                    color: embedColor,
                    title: i18next.t("welcome.title"),
                    description: i18next.t("setup.afterApproval", {
                      discord101: discord101ChannelID,
                      channelindex: channelIndexChannelID,
                      readingspeed: readingSpeedChannelID,
                      lmmeetingrecaps: lmMeetingRecapsChannelID,
                      general: generalChannelID,
                      globallinguisticsupport: globalLingSupportChannelID,
                      sassalert: sassAlertChannelID,
                      supplementalalert: suppAlertChannelID,
                      botcommands: botCommandsChannelID,
                    }),
                  },
                ],
              })
              .catch(() => {
                console.error("Failed to send DM");
              });
          } else {
            logsChannel.send(
              functions.randomText("setup.rejected", {
                user: interaction.user.id,
                nickName: nickName,
                role: role.id,
              })
            );
            interaction.user
              .send(
                functions.randomText("setup.rejectedDM", {
                  user: interaction.user.id,
                  nickName: nickName,
                  role: role.name,
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

const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");
const i18next = require("i18next");
const {
  awaitingApprovalsChannelName,
  logsChannelName,
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
    const logsChannel = await functions.findChannel(
      interaction,
      logsChannelName
    );
    const nickName = interaction.options.getString("full_name");
    const role = interaction.options.getRole("target_language");

    await interaction.user.send(
      functions.randomText("setup.waitForApproveDM", {
        nickName: nickName,
        role: role.name,
      })
    );
    await interaction.reply({
      content: functions.randomEphemeralText("requestAcquired", {}),
      ephemeral: true,
    });

    await approvalChannel
      .send(
        functions.randomText("setup.request", {
          user: interaction.user.id,
          nickName: nickName,
          role: role.id,
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

        collector.on("collect", (reaction) => {
          replyMessage.react("🍻");
          if (reaction.emoji.name === "✅") {
            interaction.member.setNickname(nickName).catch(() => {
              interaction.user.send(functions.randomText("setup.error", {}));
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
            interaction.user.send(
              functions.randomText("setup.acceptedDM", {
                user: interaction.user.id,
                nickName: nickName,
                role: role.name,
              })
            );
            interaction.user.send({
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
            });
          } else {
            logsChannel.send(
              functions.randomText("setup.rejected", {
                user: interaction.user.id,
                nickName: nickName,
                role: role.id,
              })
            );
            interaction.user.send(
              functions.randomText("setup.rejectedDM", {
                user: interaction.user.id,
                nickName: nickName,
                role: role.name,
              })
            );
          }
        });
      });
  },
};

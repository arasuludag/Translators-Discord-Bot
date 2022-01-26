const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");
const { notificationChannelName } = require("../config.json");

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
    const privateChannel = await functions.findChannel(
      interaction,
      notificationChannelName
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

    await privateChannel
      .send(
        functions.randomText("setup.request", {
          user: interaction.user.id,
          nickName: nickName,
          role: role.id,
        })
      )
      .then((replyMessage) => {
        const filter = (reaction) => reaction.emoji.name === "✅";

        const collector = replyMessage.createReactionCollector({
          filter,
          time: 300000,
        });

        collector.on("collect", () => {
          var roleName;
          switch (role.name) {
            case "csp":
              roleName = "Simplified Chinese";
              break;

            default:
              roleName = role.name.charAt(0).toUpperCase() + role.name.slice(1);
              break;
          }

          interaction.member
            .setNickname(`${nickName} - ${roleName}`)
            .catch(() => {
              interaction.user.send(functions.randomText("setup.error", {}));
            });
          interaction.member.roles.add(role);

          privateChannel.send(
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
        });
      });
  },
};

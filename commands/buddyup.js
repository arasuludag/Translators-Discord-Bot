const { SlashCommandBuilder } = require("@discordjs/builders");
const functions = require("../functions.js");
const {
  projectChannelRequestsChannelID,
  threadType,
} = require("../config.json");
const { findChannelByID } = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("buddyup")
    .setDescription("What do you want to buddy up for?")
    .addStringOption((option) =>
      option
        .setName("for")
        .setDescription("Maybe for a project?")
        .setRequired(true)
    )
    .addBooleanOption((option) =>
      option
        .setName("is_this_a_project")
        .setDescription("Yes or No")
        .setRequired(true)
    ),
  async execute(interaction) {
    const projectName = functions.discordStyleProjectName(
      interaction.options.getString("for")
    );

    const isProject = interaction.options.getBoolean("is_this_a_project");

    await interaction.reply({
      content: functions.randomEphemeralText("requestAcquired", {}),
      ephemeral: true,
    });

    let channel;
    if (interaction.options.getBoolean("is_this_a_project")) {
      channel = await findChannelByID(
        interaction,
        projectChannelRequestsChannelID
      );
    } else {
      channel = interaction.channel;
    }

    let thread;
    try {
      thread = channel.threads.cache.find((x) => x.name === projectName);
    } catch (error) {
      // If someone tries to create a thread, under a thread.
      interaction.user
        .send(functions.randomText("setParentError", {}))
        .catch(() => {
          console.error("Failed to send DM");
        });
      return;
    }

    if (thread) {
      await thread.members.add(interaction.user.id);

      interaction.user.send(
        functions
          .randomText("userAddNotify", {
            project: thread.id,
          })
          .catch(() => {
            console.error("Failed to send DM");
          })
      );

      return;
    }

    await channel.threads
      .create({
        name: projectName,
        autoArchiveDuration: "MAX",
        type: isProject ? threadType : "GUILD_PUBLIC_THREAD",
        reason: "For a project.",
      })
      .then(async (thread) => {
        if (thread.joinable) await thread.join();
        await thread.members.add(interaction.user.id);

        await interaction.user.send(
          functions.randomText("userAddNotify", {
            project: thread.id,
          })
        );

        if (isProject) {
          await channel.send(
            functions.randomText("threadCreated", {
              thread: thread.id,
              user: interaction.user.id,
            })
          );
        }
      });
  },
};

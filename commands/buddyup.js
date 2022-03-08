const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageButton, MessageActionRow } = require("discord.js");
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

    // Is this a project?
    const isProject = await interaction.options.getBoolean("is_this_a_project");

    // Create the button. Button needs a custom ID.
    const button = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId(interaction.user + interaction.id)
        .setLabel("Confirm")
        .setStyle("SUCCESS")
    );

    // If project, show the addmepromt, if not accept thread joining promt.
    if (isProject) {
      await interaction.reply(
        functions.randomSend({
          path: "addMePrompt",
          values: {
            projectName: projectName,
          },
          ephemeral: true,
          components: [button],
        })
      );
    } else {
      await interaction.reply(
        functions.randomSend({
          path: "acceptThread",
          value: {
            thread: projectName,
          },
          ephemeral: true,
          components: [button],
        })
      );
    }

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

      // If project, pass projects channel, if not, current channel.
      let channel;
      if (isProject) {
        channel = await findChannelByID(
          interaction,
          projectChannelRequestsChannelID
        );
      } else {
        channel = await interaction.channel;
      }

      // If someone tries to create thread under a thread, return.
      if (channel.isThread()) {
        // If someone tries to create a thread, under a thread.
        interaction.user
          .send(functions.randomSend("setParentError"))
          .catch(() => {
            console.error("Failed to send DM");
          });
        return;
      }

      // Find thread.
      const thread = await channel.threads.cache.find(
        (x) => x.name === projectName
      );

      // If thread exists, add the person.
      if (thread) {
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

        return;
      }

      // If thread doesn't exists, create and add the person.
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

          if (isProject) {
            await channel.send(
              functions.randomSend({
                path: "threadCreated",
                values: {
                  thread: thread.id,
                  user: interaction.user.id,
                },
              })
            );
          }
        });
    });
  },
};

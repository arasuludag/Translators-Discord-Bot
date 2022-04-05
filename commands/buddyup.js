require("dotenv").config();
const { SlashCommandBuilder } = require("@discordjs/builders");
const { MessageButton, MessageActionRow } = require("discord.js");
const functions = require("../functions.js");
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
          values: {
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
          process.env.PROJECTCHANNELREQUESTSCHANNELID
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
          autoArchiveDuration: "MAX",
          type: isProject ? process.env.THREADTYPE : "GUILD_PUBLIC_THREAD",
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

          await logsChannel.send(
            functions.randomSend({
              path: "buddyUpLog",
              values: {
                thread: thread.id,
                user: interaction.user.id,
              },
            })
          );

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

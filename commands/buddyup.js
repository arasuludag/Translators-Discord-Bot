const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { ButtonBuilder, ActionRowBuilder } = require("discord.js");
const { replyEmbed, updateEmbed, sendEmbed } = require("../customSend.js");
const { discordStyleProjectName, findChannelByID } = require("../functions.js");

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
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
  async execute(interaction) {
    // People shouldn't be able to use buddyip in projects channel.
    // There is /addme sass for that.
    if (interaction.channel === process.env.PROJECTCHANNELREQUESTSCHANNELID) {
      await replyEmbed(interaction, {
        path: "noBuddyUpInProjectsChannel",
        ephemeral: true,
      });
      return;
    }

    let projectName;
    try {
      projectName = discordStyleProjectName(
        interaction.options.getString("for")
      );
    } catch (error) {
      await replyEmbed(interaction, {
        path: "enterProperName",
        ephemeral: true,
      });
      return;
    }

    const logsChannel = await findChannelByID(
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

    // Is this a project?
    const isProject = await interaction.options.getBoolean("is_this_a_project");

    if (isProject) {
      sassAdd(interaction, projectName, button, logsChannel);
      return;
    }

    await replyEmbed(interaction, {
      path: "acceptThread",
      values: {
        thread: projectName,
      },
      ephemeral: true,
      components: [button],
    });

    const filter = (i) => i.customId === interaction.user + interaction.id;

    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      max: 1,
      time: 300000,
    });

    collector.on("collect", async (i) => {
      // Changes the message to acknowledge button press.
      await updateEmbed(i, { path: "requestAcquired", components: [] });

      const channel = await interaction.channel;

      // If someone tries to create thread under a thread, return.
      if (channel.isThread() || !channel.type === 0) {
        // If someone tries to create a thread, under a thread.
        sendEmbed(interaction.user, "setParentError");
        return;
      }

      sendEmbed(interaction.user, {
        path: "willBeReplaced",
        values: {
          this: "/buddyup",
          byThis: "/addme sass",
        },
      });

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

        await sendEmbed(interaction.user, {
          path: "userAddNotify",
          values: {
            project: thread.id,
          },
        });

        await sendEmbed(logsChannel, {
          path: "buddyUpLog",
          values: {
            thread: thread.id,
            user: interaction.user.id,
          },
        });

        return;
      }

      // If thread doesn't exists, create and add the person.
      await channel.threads
        .create({
          name: projectName,
          autoArchiveDuration: 10080,
          type: 11,
        })
        .then(async (thread) => {
          if (thread.joinable) await thread.join();
          await thread.members.add(interaction.user.id);

          await sendEmbed(interaction.user, {
            path: "userAddNotify",
            values: {
              project: thread.id,
            },
          });

          await sendEmbed(logsChannel, {
            path: "buddyUpLog",
            values: {
              thread: thread.id,
              user: interaction.user.id,
            },
          });
        });
    });
  },
};

async function sassAdd(interaction, projectName, button, logsChannel) {
  await replyEmbed(interaction, {
    path: "addMePromptThread",
    values: {
      projectName: projectName,
    },
    ephemeral: true,
    components: [button],
  });

  const filter = (i) => i.customId === interaction.user + interaction.id;

  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    max: 1,
    time: 300000,
  });

  collector.on("collect", async (i) => {
    // Changes the message to acknowledge button press.
    await updateEmbed(i, { path: "requestAcquired", components: [] });

    const channel = await findChannelByID(
      interaction,
      process.env.PROJECTCHANNELREQUESTSCHANNELID
    );

    // If someone tries to create thread under a thread, return.
    if (channel.isThread() || !channel.type === 0) {
      // If someone tries to create a thread, under a thread.
      sendEmbed(interaction.user, "setParentError");
      return;
    }

    // Find thread.
    let thread = await channel.threads.cache.find(
      (x) => x.name === projectName
    );

    // If thread cannot be found, look at the archived ones.
    if (!thread) {
      let archivedThreads = await interaction.channel.threads?.fetchArchived();
      thread = await archivedThreads?.threads.find(
        (x) => x.name === projectName
      );
    }

    // If thread exists, add the person.
    if (thread) {
      await thread.setArchived(false); // unarchive if archived.

      await thread.members.add(interaction.user.id);

      await sendEmbed(interaction.user, {
        path: "userAddNotify",
        values: {
          project: thread.id,
        },
      });

      await sendEmbed(logsChannel, {
        path: "buddyUpLog",
        values: {
          thread: thread.id,
          user: interaction.user.id,
        },
      });

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

        await sendEmbed(interaction.user, {
          path: "userAddNotify",
          values: {
            project: thread.id,
          },
        });

        await sendEmbed(logsChannel, {
          path: "buddyUpLog",
          values: {
            thread: thread.id,
            user: interaction.user.id,
          },
        });

        await sendEmbed(channel, {
          path: "threadCreated",
          values: {
            thread: interaction.options.getString("for"),
            user: interaction.user.id,
          },
        });
      });
  });
}

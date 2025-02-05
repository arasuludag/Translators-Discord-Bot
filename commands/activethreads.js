const { SlashCommandBuilder } = require("discord.js");
const { findChannelByID } = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("listprojectthreads")
    .setDescription("List the threads on this channel")
    .addBooleanOption((option) =>
      option
        .setName("include_archived")
        .setDescription("Include archived threads.")
    ),
  async execute(interaction) {
    const isArchiveIncluded =
      interaction.options.getBoolean("include_archived");

    const projectsChannel = await findChannelByID(
      interaction,
      process.env.PROJECTCHANNELREQUESTSCHANNELID
    );

    const activeThreads = await projectsChannel.threads.fetchActive();
    const threadNames = Array.from(activeThreads.threads.values() || []).map(
      (thread) => thread.name
    );

    let message = `**Active:**\n${threadNames.join("\n")}`;

    if (isArchiveIncluded) {
      const archivedThreads = await projectsChannel.threads.fetchArchived();
      const archivedThreadNames = Array.from(
        archivedThreads.threads.values() || []
      ).map((thread) => thread.name);
      message = `\n \n**Archived:**\n${archivedThreadNames.join("\n")}`;
    }

    interaction.reply({
      content: message || "None",
      ephemeral: true,
    });
  },
};

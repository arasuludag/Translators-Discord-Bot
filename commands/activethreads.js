const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
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
    await interaction.deferReply({ ephemeral: true });

    const isArchiveIncluded =
      interaction.options.getBoolean("include_archived");

    const projectsChannel = await findChannelByID(
      interaction,
      process.env.PROJECTCHANNELREQUESTSCHANNELID
    );

    // Get active threads
    const activeThreads = await projectsChannel.threads.fetchActive();
    const threadNames = Array.from(activeThreads.threads.values() || []).map(
      (thread) => thread.name
    );

    // Create embeds for active threads
    const totalActiveEmbeds = Math.ceil(threadNames.length / 25);
    const activeEmbedsToSend = [];

    for (let embedIndex = 0; embedIndex < totalActiveEmbeds; embedIndex++) {
      const startIdx = embedIndex * 25;
      const endIdx = Math.min(startIdx + 25, threadNames.length);
      const currentBatch = threadNames.slice(startIdx, endIdx);

      const activeEmbed = new EmbedBuilder()
        .setTitle(embedIndex === 0 ? `Active Threads (${threadNames.length})` : "Active Threads (continued)")
        .setColor(parseInt(process.env.EMBEDCOLOR))
        .setTimestamp();

      if (currentBatch.length > 0) {
        let description = "";
        for (let i = 0; i < currentBatch.length; i++) {
          description += `🧵 ${currentBatch[i]}\n`;
        }
        activeEmbed.setDescription(description);
      } else {
        activeEmbed.setDescription("No active threads found.");
      }

      if (totalActiveEmbeds > 1) {
        activeEmbed.setFooter({
          text: `Page ${embedIndex + 1}/${totalActiveEmbeds}${embedIndex < totalActiveEmbeds - 1 ? " - See next message for more" : ""}`
        });
      }

      activeEmbedsToSend.push(activeEmbed);
    }

    // Send the first active threads embed as the reply
    if (activeEmbedsToSend.length > 0) {
      await interaction.editReply({
        embeds: [activeEmbedsToSend[0]],
      });

      // Send any additional active embeds as follow-ups
      for (let i = 1; i < activeEmbedsToSend.length; i++) {
        await interaction.followUp({
          embeds: [activeEmbedsToSend[i]],
          ephemeral: true
        });
      }
    } else {
      await interaction.editReply({
        content: "No active threads found.",
      });
    }

    // Process archived threads if requested
    if (isArchiveIncluded) {
      const archivedThreads = await projectsChannel.threads.fetchArchived();
      const archivedThreadNames = Array.from(
        archivedThreads.threads.values() || []
      ).map((thread) => thread.name);

      // Create embeds for archived threads
      const totalArchivedEmbeds = Math.ceil(archivedThreadNames.length / 25);
      const archivedEmbedsToSend = [];

      for (let embedIndex = 0; embedIndex < totalArchivedEmbeds; embedIndex++) {
        const startIdx = embedIndex * 25;
        const endIdx = Math.min(startIdx + 25, archivedThreadNames.length);
        const currentBatch = archivedThreadNames.slice(startIdx, endIdx);

        const archivedEmbed = new EmbedBuilder()
          .setTitle(embedIndex === 0 ? `Archived Threads (${archivedThreadNames.length})` : "Archived Threads (continued)")
          .setColor(parseInt(process.env.EMBEDCOLOR))
          .setTimestamp();

        if (currentBatch.length > 0) {
          let description = "";
          for (let i = 0; i < currentBatch.length; i++) {
            description += `🧵 ${currentBatch[i]}\n`;
          }
          archivedEmbed.setDescription(description);
        } else {
          archivedEmbed.setDescription("No archived threads found.");
        }

        if (totalArchivedEmbeds > 1) {
          archivedEmbed.setFooter({
            text: `Page ${embedIndex + 1}/${totalArchivedEmbeds}${embedIndex < totalArchivedEmbeds - 1 ? " - See next message for more" : ""}`
          });
        }

        archivedEmbedsToSend.push(archivedEmbed);
      }

      // Send all archived embeds as follow-ups
      for (let i = 0; i < archivedEmbedsToSend.length; i++) {
        await interaction.followUp({
          embeds: [archivedEmbedsToSend[i]],
          ephemeral: true
        });
      }
    }
  },
};

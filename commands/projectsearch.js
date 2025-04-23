const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require("discord.js");
const { findChannelByID } = require("../functions.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("projectsearch")
    .setDescription("Search through existing threads by project name")
    .addStringOption((option) =>
      option
        .setName("project_name")
        .setDescription("Name of the project to search for")
        .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    // Get the project name from the command options
    const projectName = interaction.options.getString("project_name").toLowerCase();
    
    // Get the project channel requests channel ID from environment variables
    const projectChannelRequestsChannel = await findChannelByID(
      interaction,
      process.env.PROJECTCHANNELREQUESTSCHANNELID
    );
    
    if (!projectChannelRequestsChannel) {
      return await interaction.editReply({
        content: "An error occurred. Please try again later or contact an admin if the issue persists.",
      });
    }

    try {
      // Fetch active threads
      const activeThreads = await projectChannelRequestsChannel.threads.fetchActive();
      const activeThreadsList = Array.from(activeThreads.threads.values() || []);
      
      // Fetch archived threads
      const archivedThreads = await projectChannelRequestsChannel.threads.fetchArchived();
      const archivedThreadsList = Array.from(archivedThreads.threads.values() || []);
      
      // Combine both lists
      const allThreadsList = [...activeThreadsList, ...archivedThreadsList];
      
      // Filter threads based on the search query (fuzzy matching)
      const matchingThreads = allThreadsList.filter(thread => 
        thread.name.toLowerCase().includes(projectName)
      );

      // If no threads found
      if (matchingThreads.length === 0) {
        // Check for similar threads to suggest
        const similarThreads = [];
        
        allThreadsList.forEach(thread => {
          const threadName = thread.name.toLowerCase();
          // Simple similarity check - if the thread name contains any part of the search term
          // or vice versa, consider it similar
          const searchTerms = projectName.split(/\s+/);
          const threadTerms = threadName.split(/\s+/);
          
          for (const term of searchTerms) {
            if (term.length > 2 && threadName.includes(term)) {
              similarThreads.push(thread);
              break;
            }
          }
          
          if (!similarThreads.includes(thread)) {
            for (const term of threadTerms) {
              if (term.length > 2 && projectName.includes(term)) {
                similarThreads.push(thread);
                break;
              }
            }
          }
        });
        
        if (similarThreads.length > 0) {
          // Show similar threads suggestions
          let suggestionsText = "";
          const suggestions = similarThreads.slice(0, 3);
          
          suggestions.forEach(thread => {
            const threadGroup = thread.name.split("-")[0] || "unknown";
            suggestionsText += `- "${thread.name}" (${threadGroup} group)\n`;
          });
          
          return await interaction.editReply({
            content: `**❌ No exact matches for "${projectName}"**\n\nDid you mean:\n${suggestionsText}\n\nTry searching again with one of these terms, or:\n- Create new thread: \`/jointhread\`\n- Join manual project: \`/request project access\``,
          });
        }
        
        // No similar threads found
        return await interaction.editReply({
          content: `**❌ No threads found for "${projectName}"**\n\nOptions:\n1️⃣ Try a different search term\n2️⃣ Create new thread with \`/jointhread\`\n3️⃣ For manual projects, use \`/request project access\``,
        });
      }
      
      // Format the results into embeds
      if (matchingThreads.length === 1) {
        // Single result format - simple embed
        const thread = matchingThreads[0];
        const createdAt = Math.floor(thread.createdTimestamp / 1000);
        const memberCount = (await thread.members.fetch()).size;
        const status = thread.archived ? "Archived" : "Active";
        
        const embed = new EmbedBuilder()
          .setTitle(`🔍 Found 1 matching thread for "${projectName}"`)
          .setColor(parseInt(process.env.EMBEDCOLOR))
          .setDescription(`📂 **"${thread.name}"**\n📅 Created: <t:${createdAt}:R>\n👥 Current participants: ${memberCount}\n📍 Status: ${status}\n\n➡️ Click to view: <#${thread.id}>\nTo join this thread, use:\n\`/jointhread ${thread.name}\`\n\nNeed to create a new thread instead? Use \`/jointhread\``)
          .setTimestamp();
        
        return await interaction.editReply({
          embeds: [embed],
        });
      } else {
        // Sort threads by creation timestamp (newest first)
        const sortedThreads = matchingThreads.sort((a, b) => 
          b.createdTimestamp - a.createdTimestamp
        );
        
        // Create a main embed
        const mainEmbed = new EmbedBuilder()
          .setTitle(`🔍 Search Results for "${projectName}"`)
          .setColor(parseInt(process.env.EMBEDCOLOR)) 
          .setDescription(`Found ${matchingThreads.length} matching threads.\n\nTo join a thread, use \`/jointhread threadname\`\nNeed a new thread? Use \`/jointhread\``)
          .setTimestamp();
        
        // Calculate how many embeds we'll need (each embed can have up to 25 fields)
        const totalEmbeds = Math.ceil(sortedThreads.length / 25);
        const embedsToSend = [];
        
        for (let embedIndex = 0; embedIndex < totalEmbeds; embedIndex++) {
          const startIdx = embedIndex * 25;
          const endIdx = Math.min(startIdx + 25, sortedThreads.length);
          
          // For first embed, use the main embed we created
          const currentEmbed = embedIndex === 0 ? mainEmbed : new EmbedBuilder()
            .setTitle(`🔍 Search Results for "${projectName}" (continued)`)
            .setColor(parseInt(process.env.EMBEDCOLOR));
          
          // Add thread info as fields
          for (let i = startIdx; i < endIdx; i++) {
            const thread = sortedThreads[i];
            const createdAt = Math.floor(thread.createdTimestamp / 1000);
            const memberCount = (await thread.members.fetch()).size;
            const status = thread.archived ? "🔴 Archived" : "🟢 Active";
            
            currentEmbed.addFields({
              name: `🧵 "${thread.name}"`,
              value: `📅 Created: <t:${createdAt}:R>\n👥 Participants: ${memberCount}\n📍 Status: ${status}\n➡️ View: <#${thread.id}>\nJoin with: \`/jointhread ${thread.name}\``
            });
          }
          
          if (embedIndex === totalEmbeds - 1) {
            currentEmbed.setFooter({ text: `Page ${embedIndex + 1}/${totalEmbeds}` });
          } else {
            currentEmbed.setFooter({ text: `Page ${embedIndex + 1}/${totalEmbeds} - See next message for more results` });
          }
          
          embedsToSend.push(currentEmbed);
        }
        
        // Send the first embed as edit reply
        await interaction.editReply({
          embeds: [embedsToSend[0]],
        });
        
        // Send any additional embeds as follow-ups
        for (let i = 1; i < embedsToSend.length; i++) {
          await interaction.followUp({
            embeds: [embedsToSend[i]],
            ephemeral: true
          });
        }
        
        return;
      }
      
    } catch (error) {
      console.error("Error in projectsearch command:", error);
      return await interaction.editReply({
        content: "An error occurred. Please try again later or contact an admin if the issue persists.",
      });
    }
  },
}; 
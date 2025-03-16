const {
  SlashCommandBuilder,
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
    ),
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
            content: `**❌ No exact matches for "${projectName}"**\n\nDid you mean:\n${suggestionsText}\n\nTry searching again with one of these terms, or:\n- Create new thread: \`/join project thread\`\n- Join manual project: \`/request project access\``,
          });
        }
        
        // No similar threads found
        return await interaction.editReply({
          content: `**❌ No threads found for "${projectName}"**\n\nOptions:\n1️⃣ Try a different search term\n2️⃣ Create new thread with \`/join project thread\`\n3️⃣ For manual projects, use \`/request project access\``,
        });
      }
      
      // If too many results
      if (matchingThreads.length > 20) {
        return await interaction.editReply({
          content: `**📚 Found too many matches (${matchingThreads.length}+)**\n\nPlease try a more specific search term.\n\nExample: Instead of "${projectName}", try a more specific name.`,
        });
      }
      
      // Format the results
      let resultContent = "";
      
      if (matchingThreads.length === 1) {
        // Single result format
        const thread = matchingThreads[0];
        const createdAt = Math.floor(thread.createdTimestamp / 1000);
        const memberCount = (await thread.members.fetch()).size;
        const status = thread.archived ? "Archived" : "Active";
        
        resultContent = `**✨ Found 1 matching thread:**\n\n📂 "${thread.name}"\n📅 Created: <t:${createdAt}:R>\n👥 Current participants: ${memberCount}\n📍 Status: ${status}\n\n➡️ Click to join: <#${thread.id}>\n\nNeed to create a new thread instead? Use \`/join project thread\``;
      } else {
        // Multiple results format
        resultContent = `**✨ Found ${matchingThreads.length} matching threads for "${projectName}":**\n\n`;
        
        let counter = 1;
        const sortedThreads = matchingThreads.sort((a, b) => 
          b.createdTimestamp - a.createdTimestamp
        );
        
        for (const thread of sortedThreads) {
          const createdAt = Math.floor(thread.createdTimestamp / 1000);
          const memberCount = (await thread.members.fetch()).size;
          const status = thread.archived ? "Archived" : "Active";
          
          resultContent += `${counter}️⃣ "${thread.name}"\n   📅 Created: <t:${createdAt}:R>\n   👥 Participants: ${memberCount}\n   📍 Status: ${status}\n   ➡️ Join: <#${thread.id}>\n\n`;
          counter++;
        }
        
        resultContent += "Need a new thread? Use `/join project thread`\nWant to join multiple threads? Click each link above!";
      }
      
      // Send the results
      return await interaction.editReply({
        content: `**🔍 Search Results for "${projectName}"**\n\n${resultContent}`,
      });
      
    } catch (error) {
      console.error("Error in projectsearch command:", error);
      return await interaction.editReply({
        content: "An error occurred. Please try again later or contact an admin if the issue persists.",
      });
    }
  },
}; 
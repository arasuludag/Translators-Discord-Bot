async function stats(message) {
  let memberCountMessage = "";

  message.guild.roles.cache.forEach((role) => {
    memberCountMessage = memberCountMessage.concat(
      `${role.toString()} has ${role.members.size} people.\n`
    );
  });
  message.reply(`We have ${message.member.guild.memberCount} members in total. 
${memberCountMessage}\n`);
}
exports.stats = stats;

async function stats(message) {
  let memberCountMessage = "";

  message.guild.roles.cache.forEach((role) => {
    memberCountMessage = memberCountMessage.concat(
      `${role.toString()} has ${
        message.guild.roles.cache.get(role.id).members.size
      } people.
`
    );
  });
  message.reply(`We have ${message.member.guild.memberCount} members in total. 
${memberCountMessage} 
`);
}
exports.stats = stats;

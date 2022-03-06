async function list(message) {
  const mentionedRolesMap = message.mentions.roles;
  mentionedRolesMap.map((values) => {
    let memberList = "";
    values.members.map((role) => {
      memberList = memberList.concat(`${role.user.toString()}\n`);
    });
    message.reply(`${values.toString()} has 
${memberList}`);
  });
}
exports.list = list;

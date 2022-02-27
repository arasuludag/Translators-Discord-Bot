const fs = require("fs");
const functions = require("./functions");

async function pronounRoleManager(reaction, user, isAdd) {
  function roleManager(roleName) {
    const role = reaction.message.guild.roles.cache.find(
      (r) => r.name === roleName
    );

    const { guild } = reaction.message; // Store the guild of the reaction in variable

    const member = guild.members.cache.find((member) => member.id === user.id); // Find the member who reacted

    if (isAdd) {
      member.roles.add(role); //assign selected role to member
      notify(roleName);
      return;
    }
    member.roles.remove(role);
    notify(roleName);
  }

  function notify(pronoun) {
    user
      .send(
        functions.randomText("userPronounNotify", {
          pronoun: pronoun,
          isAdd: isAdd ? "" : "not",
        })
      )
      .catch(() => {
        console.error("Failed to send DM");
      });
  }

  const rawConfig = fs.readFileSync(require.resolve("./config.json"), {
    encoding: "utf8",
  });
  const config = await JSON.parse(rawConfig);

  if (reaction.message.id === config.pronounMessageID)
    switch (reaction.emoji.name) {
      case "🍓":
        roleManager("he");
        break;
      case "🍇":
        roleManager("she");
        break;
      case "🍉":
        roleManager("they");
        break;
      case "🍎":
        roleManager("him");
        break;
      case "🍏":
        roleManager("her");
        break;
      case "🍐":
        roleManager("them");
        break;
    }
}
exports.pronounRoleManager = pronounRoleManager;

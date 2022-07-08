const fs = require("fs");

async function listfunfacts(message) {
  const data = () =>
    fs.readFileSync(require.resolve("../funfacts.json"), {
      encoding: "utf8",
    });

  const dataJSON = JSON.parse(data());

  if (!dataJSON.funfacts) {
    return;
  }

  let funfacts = "";
  dataJSON.funfacts.map((fact) => {
    funfacts = funfacts.concat(`${fact}\n`);
  });
  message.reply("Funfacts: \n" + funfacts);
}
exports.listfunfacts = listfunfacts;

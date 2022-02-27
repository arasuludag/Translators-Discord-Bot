const fs = require("fs");

async function pronounMessage(message) {
  const splitMessage = message.content.substring(
    message.content.indexOf(" ") + 1
  );

  const fileName = "./config.json";
  const file = require(fileName);

  file.pronounMessageID = splitMessage;

  fs.writeFile(
    fileName,
    JSON.stringify(file, null, 2),
    function writeJSON(err) {
      if (err) return console.log(err);
    }
  );
}
exports.pronounMessage = pronounMessage;

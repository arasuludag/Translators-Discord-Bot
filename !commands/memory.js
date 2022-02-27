async function memory(message) {
  const used = process.memoryUsage();
  let response = "";
  for (let key in used) {
    response = response.concat(
      `${key} ${Math.round((used[key] / 1024 / 1024) * 100) / 100} MB\n`
    );
  }
  message.channel.send(response);
}
exports.memory = memory;

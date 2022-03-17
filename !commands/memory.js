async function memory(message) {
  const cpuUsage = process.cpuUsage();
  const memoryUsed = process.memoryUsage();

  let response = `CPU Usage \nUser: ${cpuUsage.user} System: ${cpuUsage.system} \n \nMemory Usage:\n`;
  for (let key in memoryUsed) {
    response = response.concat(
      `${key} ${Math.round((memoryUsed[key] / 1024 / 1024) * 100) / 100} MB\n`
    );
  }
  message.channel.send(response);
}
exports.memory = memory;

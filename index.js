const mysqldump = require('mysqldump');
const { Webhook, MessageBuilder } = require('discord-webhook-node');
const config = require('./config.json');
const databaseInfo = config.database_info;
const discordConfig = config.discord_webhook;
const backupSchedule = config.backup_schedule;
const root = GetResourcePath(GetCurrentResourceName());

(async () => {
  while (true) {
    const now = new Date();
    const dayOfMonth = now.getDate();
    const hour = now.getHours();
    const minute = now.getMinutes();
    if (shouldBackup(dayOfMonth, hour, minute)) {
      const formattedFilename = getFormattedFilename(now);
      console.log(formattedFilename);
      await performBackup(formattedFilename);
    }
    await delay(60000);
  }
})();

function getFormattedFilename(now) {
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${root}/sql/${databaseInfo.database}-${day}-${month}-${year}-${hours}-${minutes}.sql`;
}

async function performBackup(filename) {
  try {
    await mysqldump({
      connection: {
        host: databaseInfo.host,
        user: databaseInfo.user,
        password: databaseInfo.password,
        database: databaseInfo.database,
      },
      dumpToFile: filename,
    });
    if (discordConfig.enable) {
      const webhook = discordConfig.webhook;
      if (!webhook) return;
      const hook = new Webhook(webhook);
      const embed = new MessageBuilder()
        .setAuthor("Database Backup")
        .setTimestamp()
        .setColor(discordConfig.color)
        .addField("Path", `\`${filename}\``)
        .addField("Database", databaseInfo.database)
        .addField("Date", `${new Date()}`)
        .setFooter(discordConfig.footer);
      hook.send(embed);
      hook.sendFile(filename);
    }
  } catch (error) {
    console.error("Backup failed:", error);
  }
}

function shouldBackup(dayOfMonth, hour, minute) {
  const schedule = backupSchedule;
  const isDayMatch = schedule.days === "all" || schedule.days.includes(dayOfMonth);
  const isHourMatch = schedule.hours === "all" || schedule.hours.includes(hour);
  return isDayMatch && isHourMatch && schedule.minutes.includes(minute);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
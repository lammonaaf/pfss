const { Routes } = require('discord.js');
const { clientId, guildId } = require('./config');
const { commandBody, listBotGuildIds, registerOnGuilds, restClient } = require('./register-commands');

(async () => {
	try {
		const rest = restClient();
		const guildIds = await listBotGuildIds(rest);
		if (guildId && !guildIds.includes(guildId)) guildIds.push(guildId);

		if (guildIds.length === 0) {
			const body = commandBody();
			console.log(`Refreshing ${body.length} application (/) command(s) globally.`);
			const data = await rest.put(Routes.applicationCommands(clientId), { body });
			console.log(`Registered ${data.length} command(s) globally. Discord can take up to an hour to show them.`);
			return;
		}

		console.log(`Refreshing application (/) commands on ${guildIds.length} server(s).`);
		await registerOnGuilds(guildIds);
	} catch (error) {
		console.error(error);
		process.exitCode = 1;
	}
})();

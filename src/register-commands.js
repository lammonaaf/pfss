const { REST, Routes } = require('discord.js');
const { token, clientId } = require('./config');
const { loadCommands } = require('./load-commands');

function commandBody() {
	return loadCommands().map((command) => command.data.toJSON());
}

function restClient() {
	return new REST().setToken(token);
}

async function listBotGuildIds(rest) {
	const ids = [];
	let after;

	for (;;) {
		const query = { limit: 200 };
		if (after) query.after = after;

		const page = await rest.get(Routes.userGuilds(), { query });
		for (const guild of page) ids.push(guild.id);

		if (page.length < 200) break;
		after = page[page.length - 1].id;
	}

	return ids;
}

async function registerOnGuilds(guildIds) {
	const unique = [...new Set(guildIds.filter(Boolean))];
	if (unique.length === 0) return 0;

	const rest = restClient();
	const body = commandBody();

	for (const guildId of unique) {
		try {
			const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body });
			console.log(`Registered ${data.length} command(s) on guild ${guildId}.`);
		} catch (error) {
			console.error(`Failed to register commands on guild ${guildId}.`, error);
		}
	}

	return unique.length;
}

module.exports = { commandBody, listBotGuildIds, registerOnGuilds, restClient };

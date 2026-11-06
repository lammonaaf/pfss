const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
const { token } = require('./config');
const { loadCommands } = require('./load-commands');
const { registerOnGuilds } = require('./register-commands');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

for (const command of loadCommands()) {
	client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, async (readyClient) => {
	console.log(`Ready. Logged in as ${readyClient.user.tag}.`);
	await registerOnGuilds([...readyClient.guilds.cache.keys()]);
});

client.on(Events.GuildCreate, async (guild) => {
	console.log(`Joined ${guild.name} (${guild.id}). Registering commands.`);
	await registerOnGuilds([guild.id]);
});

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;

	const command = client.commands.get(interaction.commandName);
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		const payload = { content: 'There was an error while executing this command.', ephemeral: true };
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp(payload);
		} else {
			await interaction.reply(payload);
		}
	}
});

client.login(token);

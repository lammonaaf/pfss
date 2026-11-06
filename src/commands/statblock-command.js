const { SlashCommandBuilder } = require('discord.js');
const { parseStatblock, formatCommand } = require('pf2e-sage-stats');

const DISCORD_MESSAGE_LIMIT = 2000;

function codeBlockMessages(text) {
	const open = '```\n';
	const close = '\n```';
	const max = DISCORD_MESSAGE_LIMIT - open.length - close.length;
	const messages = [];
	let rest = text;

	while (rest.length > max) {
		let cut = rest.lastIndexOf(' ', max);
		if (cut <= 0) cut = max;
		messages.push(`${open}${rest.slice(0, cut)}${close}`);
		rest = rest.slice(cut).trimStart();
	}

	messages.push(`${open}${rest}${close}`);
	return messages;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('statblock-command')
		.setDescription('Accept pf2e statblock text and formats it into Sage\'s create command.')
		.addStringOption((option) =>
			option
				.setName('text')
				.setDescription('The statblock text.')
				.setRequired(true)
				.setMaxLength(6000),
		)
		.addStringOption((option) =>
			option.setName('alias').setDescription('Creature alias.').setRequired(false),
		)
		.addBooleanOption((option) =>
			option.setName('default').setDescription('Include values for untrained skills.').setRequired(false),
		)
		.addBooleanOption((option) =>
			option.setName('secret').setDescription('Include secret DCs.').setRequired(false),
		),
	async execute(interaction) {
		const text = interaction.options.getString('text', true);
		const alias = interaction.options.getString('alias') ?? null;
		const includeDefault = interaction.options.getBoolean('default') ?? false;
		const secret = interaction.options.getBoolean('secret') ?? false;
		const stats = parseStatblock(null, text, alias);
		const command = formatCommand(stats, secret, includeDefault);
		const [first, ...rest] = codeBlockMessages(command);

		await interaction.reply({ content: first });
		for (const content of rest) {
			await interaction.followUp({ content });
		}
	},
};

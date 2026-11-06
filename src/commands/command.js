const { SlashCommandBuilder } = require('discord.js');
const { parseJSON, formatCommand } = require('pf2e-sage-stats');

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
		.setName('command')
		.setDescription('Accept a .json pf2e statblock and formats it into Sage\'s create command.')
		.addAttachmentOption((option) =>
			option.setName('file').setDescription('A .json statblock file').setRequired(true).setFileTypes('.json'),
		)
		.addBooleanOption((option) =>
			option.setName('default').setDescription('Include values for untrained skills.').setRequired(false),
		)
		.addBooleanOption((option) =>
			option.setName('secret').setDescription('Include secret DCs.').setRequired(false),
		),
	async execute(interaction) {
		const attachment = interaction.options.getAttachment('file', true);
		const includeDefault = interaction.options.getBoolean('default') ?? false;
		const secret = interaction.options.getBoolean('secret') ?? false;
		const name = attachment.name ?? 'file.json';

		if (!name.toLowerCase().endsWith('.json')) {
			await interaction.reply({
				content: 'Attach a file with a `.json` extension.',
				ephemeral: true,
			});
			return;
		}

		await interaction.deferReply();

		const response = await fetch(attachment.url);
		if (!response.ok) {
			await interaction.editReply({ content: 'Could not download that file.' });
			return;
		}

		const contents = await response.text();

		const stats = parseJSON(contents);
		const command = formatCommand(stats, secret, includeDefault);
		const [first, ...rest] = codeBlockMessages(command);

		await interaction.editReply({ content: first });
		for (const content of rest) {
			await interaction.followUp({ content });
		}
	},
};

const { SlashCommandBuilder } = require('discord.js');
const { parsePathbuilder, formatCommand } = require('pf2e-sage-stats');

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
		.setName('pathbuilder-command')
		.setDescription('Accept pathbuilder json and extracts it into character json.')
		.addAttachmentOption((option) =>
			option.setName('file').setDescription('A .json pathbuilder file').setRequired(false).setFileTypes('.json', '.txt'),
		)
		.addStringOption((option) =>
			option
				.setName('text')
				.setDescription('The json text.')
				.setRequired(false)
				.setMaxLength(6000),
		)
		.addStringOption((option) =>
			option
				.setName('id')
				.setDescription('The pathbuilder json id.')
				.setRequired(false)
				.setMaxLength(40),
		)
		.addStringOption((option) =>
			option.setName('alias').setDescription('Creature alias.').setRequired(false),
		)
		.addStringOption((option) =>
			option.setName('bump').setDescription('PFS level bumps, comma separated').setRequired(false)
		)
		.addBooleanOption((option) =>
			option.setName('default').setDescription('Include values for untrained skills.').setRequired(false),
		)
		.addBooleanOption((option) =>
			option.setName('secret').setDescription('Include secret DCs.').setRequired(false),
		),
	async execute(interaction) {
		const attachment = interaction.options.getAttachment('file') ?? null;
		const text = interaction.options.getString('text') ?? null;
		const id = interaction.options.getString('id') ?? null;
		const alias = interaction.options.getString('alias') ?? null;
		const bump = interaction.options.getString('bump') ?? null;
		const includeDefault = interaction.options.getBoolean('default') ?? false;
		const secret = interaction.options.getBoolean('secret') ?? false;

		const bumps = bump?.split(',').map((b) => b.trim().toLowerCase()) ?? [];

		let contents = null;

		if (attachment) {
			const name = attachment.name ?? 'file.json';

			if (!name.toLowerCase().endsWith('.json') && !name.toLowerCase().endsWith('.txt')) {
				await interaction.reply({
					content: 'Attach a file with a `.json` or `.txt` extension.',
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

			contents = await response.text();
		} else if (text) {
			await interaction.deferReply();
			contents = text;
		} else if (id) {
			await interaction.deferReply();

			const response = await fetch(`https://pathbuilder2e.com/json.php?id=${id}`);
			if (!response.ok) {
				console.log(response)
				await interaction.editReply({ content: 'Could not download the file.' });
				return;
			}

			contents = await response.text();
		} else {
			await interaction.editReply({ content: 'You should provide the json.' });
			return;
		}

		const stats = parsePathbuilder(contents, alias, {
			default: bumps.length > 0 ? 1 : 0,
			attack: bumps.includes('attack') ? 2 : undefined,
			ac: bumps.includes('ac') ? 2 : undefined,
			saves: bumps.includes('saves') ? 2 : undefined,
			skills: bumps.includes('skills') ? 2 : undefined,
			spells: bumps.includes('spells') ? 2 : undefined,
			perception: bumps.includes('perception') ? 2 : undefined,
		});
		
		const command = formatCommand(stats, secret, includeDefault);
		const [first, ...rest] = codeBlockMessages(command);

		await interaction.editReply({ content: first });
		for (const content of rest) {
			await interaction.followUp({ content });
		}
	},
};

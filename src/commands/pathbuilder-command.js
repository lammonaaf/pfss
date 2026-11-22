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
			option.setName('file').setDescription('A .json pathbuilder file').setRequired(true).setFileTypes('.json'),
		)
		.addStringOption((option) =>
			option.setName('alias').setDescription('Creature alias.').setRequired(false),
		)
		.addNumberOption((option) =>
			option.setName('default-bump').setDescription('PFS level bump, typically 0 or 2').setRequired(false)
		)
		.addNumberOption((option) =>
			option.setName('attack-bump').setDescription('PFS level bump, typically 0 or 2').setRequired(false)
		)
		.addNumberOption((option) =>
			option.setName('ac-bump').setDescription('PFS level bump, typically 0 or 2').setRequired(false)
		)
		.addNumberOption((option) =>
			option.setName('saves-bump').setDescription('PFS level bump, typically 0 or 2').setRequired(false)
		)
		.addNumberOption((option) =>
			option.setName('skills-bump').setDescription('PFS level bump, typically 0 or 2').setRequired(false)
		)
		.addNumberOption((option) =>
			option.setName('spells-bump').setDescription('PFS level bump, typically 0 or 2').setRequired(false)
		)
		.addNumberOption((option) =>
			option.setName('perception-bump').setDescription('PFS level bump, typically 0 or 2').setRequired(false)
		)
		.addNumberOption((option) =>
			option.setName('hp-bump').setDescription('PFS level bump, typically 0 or 2').setRequired(false)
		)
		.addBooleanOption((option) =>
			option.setName('default').setDescription('Include values for untrained skills.').setRequired(false),
		)
		.addBooleanOption((option) =>
			option.setName('secret').setDescription('Include secret DCs.').setRequired(false),
		),
	async execute(interaction) {
		const attachment = interaction.options.getAttachment('file', true);
		const alias = interaction.options.getString('alias') ?? null;
		const defaultBump = interaction.options.getNumber('default-bump') ?? 0;
		const attackBump = interaction.options.getNumber('attack-bump') ?? undefined;
		const acBump = interaction.options.getNumber('ac-bump') ?? undefined;
		const savesBump = interaction.options.getNumber('saves-bump') ?? undefined;
		const skillsBump = interaction.options.getNumber('skills-bump') ?? undefined;
		const spellsBump = interaction.options.getNumber('spells-bump') ?? undefined;
		const perceptionBump = interaction.options.getNumber('perception-bump') ?? undefined;
		const hpBump = interaction.options.getNumber('hp-bump') ?? undefined;
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

		const stats = parsePathbuilder(contents, alias, {
			default: defaultBump,
			attack: attackBump,
			ac: acBump,
			saves: savesBump,
			skills: skillsBump,
			spells: spellsBump,
			perception: perceptionBump,
			hp: hpBump,
		});
		
		const command = formatCommand(stats, secret, includeDefault);
		const [first, ...rest] = codeBlockMessages(command);

		await interaction.editReply({ content: first });
		for (const content of rest) {
			await interaction.followUp({ content });
		}
	},
};

const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { formatJSON, parsePathbuilder } = require('pf2e-sage-stats');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pathbuilder')
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

		await interaction.editReply({
			files: [new AttachmentBuilder(Buffer.from(formatJSON(stats)), { name: stats.alias + '.json' })],
		});
	},
};

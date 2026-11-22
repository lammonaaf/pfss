const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { parseStatblock, formatJSON } = require('pf2e-sage-stats');

// attack: zod.coerce.number().optional(),
// ac: zod.coerce.number().optional(),
// saves: zod.coerce.number().optional(),
// skills: zod.coerce.number().optional(),
// spells: zod.coerce.number().optional(),
// perception: zod.coerce.number().optional(),
// hp: zod.coerce.number().optional(),

module.exports = {
	data: new SlashCommandBuilder()
		.setName('statblock')
		.setDescription('Accept pf2e statblock text and extracts it into json.')
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
		const text = interaction.options.getString('text', true);
		const alias = interaction.options.getString('alias') ?? null;
		const defaultBump = interaction.options.getNumber('default-bump') ?? 0;
		const attackBump = interaction.options.getNumber('attack-bump') ?? undefined;
		const acBump = interaction.options.getNumber('ac-bump') ?? undefined;
		const savesBump = interaction.options.getNumber('saves-bump') ?? undefined;
		const skillsBump = interaction.options.getNumber('skills-bump') ?? undefined;
		const spellsBump = interaction.options.getNumber('spells-bump') ?? undefined;
		const perceptionBump = interaction.options.getNumber('perception-bump') ?? undefined;
		const hpBump = interaction.options.getNumber('hp-bump') ?? undefined;

		const stats = parseStatblock(null, text, alias, {
			default: defaultBump,
			attack: attackBump,
			ac: acBump,
			saves: savesBump,
			skills: skillsBump,
			spells: spellsBump,
			perception: perceptionBump,
			hp: hpBump,
		});

		await interaction.reply({
			files: [new AttachmentBuilder(Buffer.from(formatJSON(stats)), { name: stats.alias + '.json' })],
		});
	},
};

const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { parseStatblock, formatTSV } = require('pf2e-sage-stats');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('statblock-tsv')
		.setDescription('Accept pf2e statblock text and extracts it directly into Sage\'s tsv.')
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
		const tsv = formatTSV(stats, secret, includeDefault);

		await interaction.reply({
			files: [new AttachmentBuilder(Buffer.from(tsv), { name: stats.alias + '.tsv' })],
		});
	},
};

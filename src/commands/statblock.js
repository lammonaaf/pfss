const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { parseStatblock, formatJSON } = require('pf2e-sage-stats');

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
		),
	async execute(interaction) {
		const text = interaction.options.getString('text', true);
		const alias = interaction.options.getString('alias') ?? null;
		const stats = parseStatblock(null, text, alias);

		await interaction.reply({
			files: [new AttachmentBuilder(Buffer.from(formatJSON(stats)), { name: stats.alias + '.json' })],
		});
	},
};

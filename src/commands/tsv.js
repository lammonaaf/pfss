const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { formatTSV, parseJSON } = require('pf2e-sage-stats');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tsv')
		.setDescription('Accept a .json pf2e statblock and formats it into Sage\'s tsv.')
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
		const tsv = formatTSV(stats, secret, includeDefault);

		const message = await interaction.editReply({
			files: [new AttachmentBuilder(Buffer.from(tsv), { name: stats.alias + '.tsv' })],
		});

		const attachmentUrl = message.attachments.first()?.url;

		if (attachmentUrl) {
			await interaction.editReply({
				content: `[Direct link](${attachmentUrl})`,
			});
		}
	},
};

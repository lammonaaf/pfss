const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { transposeSkills } = require('pf2e-sage-stats');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skills')
		.setDescription('Accept a .tsv with party stats and generates a skill summary.')
		.addAttachmentOption((option) =>
			option.setName('file').setDescription('A .tsv of sage! pc export').setRequired(true).setFileTypes('.tsv'),
		),
	async execute(interaction) {
		const attachment = interaction.options.getAttachment('file', true);
		const name = attachment.name ?? 'file.tsv';

		if (!name.toLowerCase().endsWith('.tsv')) {
			await interaction.reply({
				content: 'Attach a file with a `.tsv` extension.',
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

		const skills = transposeSkills(contents);

		await interaction.editReply({
			files: [new AttachmentBuilder(Buffer.from(skills), { name: 'skills.md' })],
		});
	},
};

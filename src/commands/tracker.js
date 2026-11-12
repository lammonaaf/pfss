const { SlashCommandBuilder } = require('discord.js');
const { parseTracker } = require('pf2e-sage-stats');
const { enqueue, isTrackerParseError, textChannel, trackerMessage } = require('../tracker');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('tracker')
		.setDescription('Post a formatted encounter tracker from a JSON file.')
		.addAttachmentOption((option) =>
			option.setName('file').setDescription('A tracker JSON file.').setRequired(true).setFileTypes('.json'),
		),
	async execute(interaction) {
		const attachment = interaction.options.getAttachment('file', true);
		const name = attachment.name ?? 'file.json';

		if (!name.toLowerCase().endsWith('.json')) {
			await interaction.reply({
				content: 'Attach a file with a `.json` extension.',
				ephemeral: true,
			});
			return;
		}

		const channel = await textChannel(interaction);
		if (!channel) {
			await interaction.reply({
				content: 'Use this command in a server channel or thread.',
				ephemeral: true,
			});
			return;
		}

		await interaction.deferReply();

		await enqueue(channel.id, async () => {
			const response = await fetch(attachment.url);
			if (!response.ok) {
				await interaction.editReply({ content: 'Could not download that file.' });
				return;
			}

			let tracker;
			try {
				tracker = parseTracker(await response.text());
			} catch (error) {
				if (isTrackerParseError(error)) {
					await interaction.editReply({ content: 'That file is not a tracker.' });
					return;
				}
				throw error;
			}

			const payload = await trackerMessage(tracker, interaction);
			if (payload.error) {
				await interaction.editReply({ content: payload.error });
				return;
			}

			await interaction.editReply(payload);
		});
	},
};

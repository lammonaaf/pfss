const { SlashCommandBuilder } = require('discord.js');
const { parseTracker } = require('pf2e-sage-stats');
const {
	editTrackerGroup,
	enqueue,
	findLatestTrackerGroup,
	isTrackerParseError,
	textChannel,
} = require('../tracker');

function failureContent(error) {
	if (error?.code === 10008) return 'That tracker message was deleted.';
	if (error?.code === 50001 || error?.code === 50013) {
		return 'I need Read Message History in this channel to find the tracker.';
	}
	if (isTrackerParseError(error)) return 'The saved tracker JSON could not be read.';
	if (error?.message === 'Could not download the tracker.') return error.message;
	return null;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('replace')
		.setDescription('Apply a new tracker json to the latest tracker in this channel.')
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

		await interaction.deferReply({ ephemeral: true });

		await enqueue(channel.id, async () => {
			try {
				const group = await findLatestTrackerGroup(channel, interaction.client.user.id);
				if (!group) {
					await interaction.editReply({ content: 'No tracker in this channel.' });
					return;
				}

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

				const result = await editTrackerGroup(group, tracker, interaction);
				if (result.error) {
					await interaction.editReply({ content: result.error });
					return;
				}

				await interaction.deleteReply();
			} catch (error) {
				const content = failureContent(error);
				if (!content) throw error;
				await interaction.editReply({ content });
			}
		});
	},
};
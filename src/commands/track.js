const { SlashCommandBuilder } = require('discord.js');
const { parseTrackerCommands } = require('pf2e-sage-stats');
const {
	editedTracker,
	normalizeInstructions,
	enqueue,
	findLatestTracker,
	isTrackerParseError,
	readTrackerMessage,
	textChannel,
	trackerMessage,
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
		.setName('track')
		.setDescription('Apply tracker instructions to the latest tracker in this channel.')
		.addStringOption((option) =>
			option
				.setName('instructions')
				.setDescription('Edits to apply, in tracker command syntax.')
				.setRequired(true)
				.setMaxLength(1000),
		)
		.addBooleanOption((option) =>
			option
				.setName('new')
				.setDescription('Post a new tracker message instead of editing the last one.')
				.setRequired(false),
		),
	async execute(interaction) {
		const line = normalizeInstructions(interaction.options.getString('instructions', true));
		const asNew = interaction.options.getBoolean('new') ?? false;

		if (parseTrackerCommands(line).length === 0) {
			await interaction.reply({
				content: 'Those instructions did not match any tracker edits.',
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
				const message = await findLatestTracker(channel, interaction.client.user.id);
				if (!message) {
					await interaction.editReply({ content: 'No tracker in this channel.' });
					return;
				}

				const tracker = editedTracker(await readTrackerMessage(message), line);
				if (!tracker) {
					await interaction.editReply({ content: 'Those instructions did not match any tracker edits.' });
					return;
				}

				const payload = await trackerMessage(tracker, interaction);
				if (payload.error) {
					await interaction.editReply({ content: payload.error });
					return;
				}

				if (asNew) {
					await channel.send(payload);
					await interaction.deleteReply();
					return;
				}

				await message.edit({ ...payload, attachments: [] });
				await interaction.deleteReply();
			} catch (error) {
				const content = failureContent(error);
				if (!content) throw error;
				await interaction.editReply({ content });
			}
		});
	},
};

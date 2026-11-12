const { SlashCommandBuilder } = require('discord.js');
const { newtracker } = require('pf2e-sage-stats');
const { enqueue, textChannel, trackerMessage } = require('../tracker');

function trackerDetails(interaction) {
	const details = {};
	const title = interaction.options.getString('title');
	const map = interaction.options.getString('map');
	const mapURL = interaction.options.getString('map-url');
	const description = interaction.options.getString('description');

	if (title) details.title = title;
	if (map) details.map = map;
	if (mapURL) details.mapURL = mapURL;
	if (description) details.description = description;

	return details;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('new-tracker')
		.setDescription('Build and post an encounter tracker from status text.')
		.addStringOption((option) =>
			option
				.setName('text')
				.setDescription('Status lines, like Name (12/34 HP): conditions.')
				.setRequired(true)
				.setMaxLength(6000),
		)
		.addStringOption((option) =>
			option.setName('title').setDescription('Tracker title.').setRequired(false).setMaxLength(200),
		)
		.addStringOption((option) =>
			option.setName('map').setDescription('Map name.').setRequired(false).setMaxLength(100),
		)
		.addStringOption((option) =>
			option.setName('map-url').setDescription('Map URL.').setRequired(false).setMaxLength(500),
		)
		.addStringOption((option) =>
			option.setName('description').setDescription('Tracker description.').setRequired(false).setMaxLength(1000),
		),
	async execute(interaction) {
		const text = interaction.options.getString('text', true);
		const tracker = newtracker(text, trackerDetails(interaction));

		if (tracker.chars.length === 0) {
			await interaction.reply({
				content: 'No creature lines found. Use lines like `Name (12/34 HP): conditions`.',
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
			const payload = await trackerMessage(tracker, interaction);
			if (payload.error) {
				await interaction.editReply({ content: payload.error });
				return;
			}

			await interaction.editReply(payload);
		});
	},
};

const { SlashCommandBuilder } = require('discord.js');
const { newtracker } = require('pf2e-sage-stats');
const { enqueue, textChannel, sendTrackerMessages } = require('../tracker');

function trackerDetails(interaction) {
	const details = {};
	const title = interaction.options.getString('title');
	const mapText = interaction.options.getString('map-text');
	const map = interaction.options.getString('map');
	const roundText = interaction.options.getString('round-text');
	const round = interaction.options.getString('round');
	const description = interaction.options.getString('description');

	if (title) details.title = title;
	if (mapText) details.mapText = mapText;
	if (map) details.map = map;
	if (roundText) details.roundText = roundText;
	if (round) details.round = round;
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
				.setRequired(false)
				.setMaxLength(6000),
		)
		.addStringOption((option) =>
			option.setName('title').setDescription('Tracker title.').setRequired(false).setMaxLength(200),
		)
		.addStringOption((option) =>
			option.setName('map-text').setDescription('Map name.').setRequired(false).setMaxLength(100),
		)
		.addStringOption((option) =>
			option.setName('map').setDescription('Map URL.').setRequired(false).setMaxLength(500),
		)
		.addStringOption((option) =>
			option.setName('round-text').setDescription('Round alias.').setRequired(false).setMaxLength(100),
		)
		.addStringOption((option) =>
			option.setName('round').setDescription('Round name or number.').setRequired(false).setMaxLength(100),
		)
		.addStringOption((option) =>
			option.setName('description').setDescription('Tracker description.').setRequired(false).setMaxLength(1000),
		),
	async execute(interaction) {
		const text = interaction.options.getString('text');
		const tracker = newtracker(text ?? '', trackerDetails(interaction));

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
			await sendTrackerMessages(channel, tracker, interaction);
			await interaction.deleteReply();
			return;
		});
	},
};

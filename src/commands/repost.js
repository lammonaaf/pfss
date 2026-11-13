const { AttachmentBuilder, ChannelType, SlashCommandBuilder } = require('discord.js');
const { enqueue, findLatestTracker, textChannel, TRACKER_FILE } = require('../tracker');

const DESTINATION_TYPES = [
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement,
	ChannelType.PublicThread,
	ChannelType.PrivateThread,
	ChannelType.AnnouncementThread,
];

function sourceFailure(error) {
	if (error?.code === 10008) return 'That tracker message was deleted.';
	if (error?.code === 50001 || error?.code === 50013) {
		return 'I need Read Message History in this channel to find the tracker.';
	}
	if (error?.message === 'Could not download the tracker.') return error.message;
	return null;
}

function destinationFailure(error) {
	if (error?.code === 50001 || error?.code === 50013) {
		return 'I need Send Messages and Attach Files in that channel.';
	}
	if (error?.code === 50083) return 'That thread is archived.';
	if (error?.code === 10003) return 'I cannot access that channel.';
	return null;
}

function canReceive(channel) {
	return Boolean(channel?.isTextBased?.() && typeof channel.send === 'function');
}

async function destinationChannel(client, selected) {
	const channel = typeof selected.send === 'function' ? selected : await client.channels.fetch(selected.id);
	if (!canReceive(channel)) return { error: 'That channel cannot receive messages.' };
	return { channel };
}

async function copiedTracker(message) {
	const files = [];

	for (const attachment of message.attachments.values()) {
		const response = await fetch(attachment.url);
		if (!response.ok) throw new Error('Could not download the tracker.');
		files.push(
			new AttachmentBuilder(Buffer.from(await response.arrayBuffer()), {
				name: attachment.name ?? TRACKER_FILE,
			}),
		);
	}

	const payload = {
		files,
		allowedMentions: { parse: [] },
	};
	if (message.content) payload.content = message.content;
	return payload;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('repost')
		.setDescription('Repost the latest tracker in this channel to another channel.')
		.addChannelOption((option) =>
			option
				.setName('channel')
				.setDescription('Channel or thread that receives the tracker.')
				.setRequired(true)
				.addChannelTypes(...DESTINATION_TYPES),
		),
	async execute(interaction) {
		const source = await textChannel(interaction);
		if (!source) {
			await interaction.reply({
				content: 'Use this command in a server channel or thread.',
				ephemeral: true,
			});
			return;
		}

		await interaction.deferReply({ ephemeral: true });

		const selected = interaction.options.getChannel('channel', true);
		let target;
		try {
			target = await destinationChannel(interaction.client, selected);
		} catch (error) {
			const content = destinationFailure(error);
			if (!content) throw error;
			await interaction.editReply({ content });
			return;
		}

		if (target.error) {
			await interaction.editReply({ content: target.error });
			return;
		}

		let payload;
		try {
			await enqueue(source.id, async () => {
				const message = await findLatestTracker(source, interaction.client.user.id);
				if (!message) {
					payload = { error: 'No tracker in this channel.' };
					return;
				}
				payload = await copiedTracker(message);
			});
		} catch (error) {
			const content = sourceFailure(error);
			if (!content) throw error;
			await interaction.editReply({ content });
			return;
		}

		if (payload.error) {
			await interaction.editReply({ content: payload.error });
			return;
		}

		try {
			await enqueue(target.channel.id, async () => {
				await target.channel.send(payload);
			});
		} catch (error) {
			const content = destinationFailure(error);
			if (!content) throw error;
			await interaction.editReply({ content });
			return;
		}

		await interaction.editReply({ content: `Reposted the tracker to ${target.channel}.` });
	},
};

const { AttachmentBuilder } = require('discord.js');
const { applyTrackerCommands, formatTracker, parseTracker, parseTrackerCommands } = require('pf2e-sage-stats');
const { renderEmojiShortcodes } = require('./emojis');

const TRACKER_FILE = 'tracker.json';
const DISCORD_MESSAGE_LIMIT = 2000;
const HISTORY_PAGE = 100;
const HISTORY_PAGES = 3;

const pending = new Map();

function enqueue(channelId, task) {
	const previous = pending.get(channelId) ?? Promise.resolve();
	const run = previous.then(task, task);
	const settled = run.then(
		() => undefined,
		() => undefined,
	);
	pending.set(channelId, settled);
	settled.then(() => {
		if (pending.get(channelId) === settled) pending.delete(channelId);
	});
	return run;
}

function newestFirst(messages) {
	return [...messages.values()].sort((a, b) => {
		const left = BigInt(a.id);
		const right = BigInt(b.id);
		if (left === right) return 0;
		return left > right ? -1 : 1;
	});
}

function isTrackerMessage(message, botId) {
	return message.author.id === botId && message.attachments.some((attachment) => attachment.name?.toLowerCase() === TRACKER_FILE);
}

function latestTrackerMessage(messages, botId) {
	return newestFirst(messages).find((message) => isTrackerMessage(message, botId)) ?? null;
}

async function findLatestTracker(channel, botId) {
	let before;

	for (let page = 0; page < HISTORY_PAGES; page += 1) {
		const messages = await channel.messages.fetch({ limit: HISTORY_PAGE, before });
		const found = latestTrackerMessage(messages, botId);
		if (found) return found;
		if (messages.size < HISTORY_PAGE) return null;
		before = newestFirst(messages).at(-1)?.id;
		if (!before) return null;
	}

	return null;
}

function isTrackerParseError(error) {
	return error instanceof SyntaxError || error?.name === 'ZodError';
}

async function readTrackerMessage(message) {
	const attachment = message.attachments.find((file) => file.name?.toLowerCase() === TRACKER_FILE);
	if (!attachment) {
		throw new Error('Tracker attachment is missing.');
	}

	const response = await fetch(attachment.url);
	if (!response.ok) {
		throw new Error('Could not download the tracker.');
	}

	return parseTracker(await response.text());
}

async function trackerMessage(tracker, interaction) {
	const content = await renderEmojiShortcodes(formatTracker(structuredClone(tracker)), interaction);
	if (content.length > DISCORD_MESSAGE_LIMIT) {
		return { error: 'That tracker is too long for one Discord message.' };
	}

	return {
		content,
		files: [new AttachmentBuilder(Buffer.from(JSON.stringify(tracker, null, 2)), { name: TRACKER_FILE })],
		allowedMentions: { parse: [] },
	};
}

async function textChannel(interaction) {
	let channel = interaction.channel;
	if (!channel && interaction.channelId) {
		channel = await interaction.client.channels.fetch(interaction.channelId);
	}
	if (!channel?.isTextBased?.() || !channel.messages) return null;
	return channel;
}

const CURLY_QUOTES = /[“”„‟«»＂〝〞〟]/g;

function normalizeInstructions(line) {
	return line.replace(CURLY_QUOTES, '"').replace(/\\"/g, '"');
}

function editedTracker(tracker, line) {
	const actions = parseTrackerCommands(normalizeInstructions(line));
	if (actions.length === 0) return null;
	return applyTrackerCommands(tracker, actions).tracker;
}

module.exports = {
	TRACKER_FILE,
	editedTracker,
	normalizeInstructions,
	enqueue,
	findLatestTracker,
	isTrackerParseError,
	latestTrackerMessage,
	readTrackerMessage,
	textChannel,
	trackerMessage,
};

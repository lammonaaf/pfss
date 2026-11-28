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

function hasTrackerAttachment(message) {
	return message.attachments.some((attachment) => attachment.name?.toLowerCase() === TRACKER_FILE);
}

function isTrackerAnchor(message, botId) {
	return message.author.id === botId && hasTrackerAttachment(message);
}

/**
 * Splits formatted tracker text into <= 2000 char chunks on newline boundaries.
 */
function splitTrackerContent(content, maxLength = DISCORD_MESSAGE_LIMIT) {
	if (content.length <= maxLength) return [content];

	const lines = content.split('\n');
	const chunks = [];
	let current = '';

	for (const line of lines) {
		// Fallback if a single line exceeds Discord's limit
		if (line.length > maxLength) {
			if (current) {
				chunks.push(current);
				current = '';
			}
			for (let i = 0; i < line.length; i += maxLength) {
				chunks.push(line.slice(i, i + maxLength));
			}
			continue;
		}

		const candidate = current ? `${current}\n${line}` : line;
		if (candidate.length > maxLength) {
			chunks.push(current);
			current = line;
		} else {
			current = candidate;
		}
	}

	if (current) chunks.push(current);
	return chunks;
}

/**
 * Finds the latest tracker anchor message (containing tracker.json) and any
 * immediately preceding bot messages that belong to the same multi-part tracker.
 * Returns messages in chronological order: [part1, part2, ..., anchorMessage].
 */
async function findLatestTrackerGroup(channel, botId) {
	let before;
	let anchorIndex = -1;
	const collected = []; // stored newest -> oldest

	for (let page = 0; page < HISTORY_PAGES; page += 1) {
		const messages = await channel.messages.fetch({ limit: HISTORY_PAGE, before });
		const sorted = newestFirst(messages);

		for (const msg of sorted) {
			if (anchorIndex === -1) {
				if (isTrackerAnchor(msg, botId)) {
					anchorIndex = collected.length;
					collected.push(msg);
				}
			} else {
				// Collect contiguous preceding messages from the same bot without tracker.json
				if (msg.author.id === botId && !hasTrackerAttachment(msg) && msg.content.length > 0) {
					collected.push(msg);
				} else {
					// Hit a non-tracker message or an older tracker; group is complete
					return collected.slice(anchorIndex).reverse();
				}
			}
		}

		if (messages.size < HISTORY_PAGE) break;
		before = sorted.at(-1)?.id;
		if (!before) break;
	}

	if (anchorIndex === -1) return null;
	return collected.slice(anchorIndex).reverse();
}

function isTrackerParseError(error) {
	return error instanceof SyntaxError || error?.name === 'ZodError';
}

async function readTrackerMessage(anchorMessage) {
	const attachment = anchorMessage.attachments.find((file) => file.name?.toLowerCase() === TRACKER_FILE);
	if (!attachment) {
		throw new Error('Tracker attachment is missing.');
	}

	const response = await fetch(attachment.url);
	if (!response.ok) {
		throw new Error('Could not download the tracker.');
	}

	return parseTracker(await response.text());
}

function createTrackerAttachment(tracker) {
	return new AttachmentBuilder(Buffer.from(JSON.stringify(tracker, null, 2)), { name: TRACKER_FILE });
}

/**
 * Builds an array of message payloads for a tracker.
 * Only the final payload receives the tracker.json attachment.
 */
async function buildTrackerPayloads(tracker, interaction) {
	const content = await renderEmojiShortcodes(formatTracker(structuredClone(tracker)), interaction);
	const chunks = splitTrackerContent(content);
	const attachment = createTrackerAttachment(tracker);

	return chunks.map((chunk, index) => {
		const isLast = index === chunks.length - 1;
		return {
			content: chunk,
			files: isLast ? [attachment] : [],
			allowedMentions: { parse: [] },
		};
	});
}

/**
 * Sends a tracker as 1 or more sequential messages in a channel (or interaction).
 * Used for initial posting and `/track new:true`.
 */
async function sendTrackerMessages(target, tracker, interaction) {
	const payloads = await buildTrackerPayloads(tracker, interaction);
	const sent = [];

	for (const payload of payloads) {
		sent.push(await target.send(payload));
	}

	return sent;
}

/**
 * Edits an existing tracker message group in-place.
 * Only edits messages whose text changed (plus the final message to update tracker.json).
 */
async function editTrackerGroup(group, tracker, interaction) {
	const payloads = await buildTrackerPayloads(tracker, interaction);

	if (payloads.length > group.length) {
		return {
			error: `That tracker grew to ${payloads.length} messages (up from ${group.length}). Re-run with \`new: True\` to post it as a new multi-part tracker.`,
		};
	}

	// Edit existing slots that are still needed
	for (let i = 0; i < payloads.length; i += 1) {
		const existingMsg = group[i];
		const nextPayload = payloads[i];
		const isNewLast = i === payloads.length - 1;
		const contentChanged = existingMsg.content !== nextPayload.content;

		// Skip API call if text didn't change and this isn't the anchor message holding tracker.json
		if (!contentChanged && !isNewLast) {
			continue;
		}

		await existingMsg.edit({
			content: nextPayload.content,
			files: nextPayload.files,
			attachments: [], // Replaces old attachments so tracker.json doesn't duplicate
			allowedMentions: nextPayload.allowedMentions,
		});
	}

	// If the tracker shrank to fewer messages, remove the extra trailing messages
	for (let i = payloads.length; i < group.length; i += 1) {
		await group[i].delete().catch(() => {});
	}

	return { ok: true };
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
	buildTrackerPayloads,
	editTrackerGroup,
	editedTracker,
	enqueue,
	findLatestTrackerGroup,
	isTrackerParseError,
	normalizeInstructions,
	readTrackerMessage,
	sendTrackerMessages,
	splitTrackerContent,
	textChannel,
};
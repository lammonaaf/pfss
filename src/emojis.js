const SHORTCODE = /:([A-Za-z0-9_]+):/g;

let applicationEmojis = null;
const fetchedGuilds = new Set();

function shortcodeNames(text) {
	return [...text.matchAll(SHORTCODE)].map((match) => match[1]);
}

function substituteShortcodes(text, emojisByName) {
	return text.replace(SHORTCODE, (full, name) => {
		const emoji = emojisByName.get(name);
		return emoji ? emoji.toString() : full;
	});
}

async function applicationEmojisByName(client) {
	const byName = new Map();
	if (!client.application) return byName;

	if (!applicationEmojis) {
		try {
			applicationEmojis = await client.application.emojis.fetch();
		} catch (error) {
			console.error('Could not fetch application emojis.', error);
			return byName;
		}
	}

	for (const emoji of applicationEmojis.values()) {
		if (emoji.name) byName.set(emoji.name, emoji);
	}

	return byName;
}

function addNamedEmojis(byName, collection, wanted) {
	for (const emoji of collection.values()) {
		if (emoji.name && wanted.has(emoji.name) && !byName.has(emoji.name)) {
			byName.set(emoji.name, emoji);
		}
	}
}

async function addGuildEmojis(byName, guild, names) {
	const wanted = new Set(names);
	addNamedEmojis(byName, guild.emojis.cache, wanted);
	if (names.every((name) => byName.has(name)) || fetchedGuilds.has(guild.id)) return;

	try {
		addNamedEmojis(byName, await guild.emojis.fetch(), wanted);
		fetchedGuilds.add(guild.id);
	} catch (error) {
		console.error('Could not fetch guild emojis.', error);
	}
}

async function renderEmojiShortcodes(text, interaction) {
	const byName = await applicationEmojisByName(interaction.client);
	const missing = shortcodeNames(text).filter((name) => !byName.has(name));

	if (missing.length > 0 && interaction.guild) {
		await addGuildEmojis(byName, interaction.guild, missing);
	}

	return substituteShortcodes(text, byName);
}

module.exports = {
	renderEmojiShortcodes,
	substituteShortcodes,
};

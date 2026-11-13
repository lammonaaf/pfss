# pfss

A Discord bot wrapping over pf2e-sage-stats command line utility.

## Setup

1. Create an application at <https://discord.com/developers/applications>, add a bot, and copy the bot token and application id.
2. Under **Bot → Privileged Gateway Intents**, leave the privileged intents off. This bot only needs the `Guilds` intent.
3. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`. `DISCORD_GUILD_ID` is optional.
4. Invite the bot with the `bot` and `applications.commands` scopes, and the Send Messages, Attach Files, and Read Message History permissions:

   `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=100352&scope=bot%20applications.commands`

5. Install and register the command, then start the bot:

```sh
npm install
npm run deploy
npm start
```

Commands are registered on every server the bot is in when it starts, and on a server as soon as the bot joins it. `npm run deploy` does the same registration without leaving the bot running. `DISCORD_GUILD_ID` is only a fallback when the bot is not in any server yet. If the bot is in no servers and that variable is empty, `npm run deploy` registers the commands globally, which can take up to an hour.

## Encounter tracker

`/tracker` takes a tracker JSON file and posts the formatted tracker, with that JSON attached as `tracker.json`. `/new-tracker` builds that same post from status text (`Name (12/34 HP): conditions`), with optional `title`, `map`, `map-url`, and `description`. `/track` reads the latest tracker in the current channel or thread, applies `instructions`, and edits that message. Set `new` to post a separate message instead; the previous one stays as it was. `/repost` copies that latest tracker, unchanged, into a text channel or thread chosen with Discord's channel picker. Public, private, and announcement threads are included.

Tracker icons are the shortcodes produced by `formatTracker` (`emptynode`, `arrownode`, `checknode`, `crossnode`, `smallnode`, `healthy`, `bruised`, `wounded`, `limping`, `beaten`, `dying`, `crossed`, `spacer`). A matching emoji on the bot application is used first, then an emoji of the same name in the server. Upload application emojis in the Developer Portal under the app's Emojis page.

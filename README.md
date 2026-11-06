# pfss

A Discord bot wrapping over pf2e-sage-stats command line utility.

## Setup

1. Create an application at <https://discord.com/developers/applications>, add a bot, and copy the bot token and application id.
2. Under **Bot → Privileged Gateway Intents**, leave the privileged intents off. This bot only needs the `Guilds` intent.
3. Copy `.env.example` to `.env` and fill in `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`. `DISCORD_GUILD_ID` is optional.
4. Invite the bot with the `bot` and `applications.commands` scopes, and the Send Messages and Attach Files permissions:

   `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=34816&scope=bot%20applications.commands`

5. Install and register the command, then start the bot:

```sh
npm install
npm run deploy
npm start
```

Commands are registered on every server the bot is in when it starts, and on a server as soon as the bot joins it. `npm run deploy` does the same registration without leaving the bot running. `DISCORD_GUILD_ID` is only a fallback when the bot is not in any server yet. If the bot is in no servers and that variable is empty, `npm run deploy` registers the commands globally, which can take up to an hour.

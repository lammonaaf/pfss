const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { parseStatblock, formatTSV } = require('pf2e-sage-stats');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('statblock-tsv')
		.setDescription('Accept pf2e statblock text and extracts it directly into Sage\'s tsv.')
		.addAttachmentOption((option) =>
			option.setName('file').setDescription('A .txt statblock file').setRequired(false).setFileTypes('.txt'),
		)
		.addStringOption((option) =>
			option
				.setName('text')
				.setDescription('The statblock text.')
				.setRequired(false)
				.setMaxLength(6000),
		)
		.addStringOption((option) =>
			option.setName('alias').setDescription('Creature alias.').setRequired(false),
		)
		.addStringOption((option) =>
			option.setName('bump').setDescription('PFS level bumps, comma separated').setRequired(false)
		)
		.addBooleanOption((option) =>
			option.setName('default').setDescription('Include values for untrained skills.').setRequired(false),
		)
		.addBooleanOption((option) =>
			option.setName('secret').setDescription('Include secret DCs.').setRequired(false),
		),
	async execute(interaction) {
		const attachment = interaction.options.getAttachment('file') ?? null;
		const text = interaction.options.getString('text') ?? null;
		const alias = interaction.options.getString('alias') ?? null;
		const bump = interaction.options.getString('bump') ?? null;
		const includeDefault = interaction.options.getBoolean('default') ?? false;
		const secret = interaction.options.getBoolean('secret') ?? false;

		const bumps = bump?.split(',').map((b) => b.trim().toLowerCase()) ?? [];

		let contents = null;

		if (attachment) {
			const name = attachment.name ?? 'file.json';

			if (!name.toLowerCase().endsWith('.txt')) {
				await interaction.reply({
					content: 'Attach a file with a `.txt` extension.',
					ephemeral: true,
				});
				return;
			}

			await interaction.deferReply();

			const response = await fetch(attachment.url);
			if (!response.ok) {
				await interaction.editReply({ content: 'Could not download that file.' });
				return;
			}

			contents = await response.text();
		} else if (text) {
			await interaction.deferReply();
			contents = text;
		} else {
			await interaction.editReply({ content: 'You should provide the statblock.' });
			return;
		}

		const stats = parseStatblock(null, contents, alias, bumps.includes('elite') ? {
			level: 1,
			default: 2,
		} : bumps.includes('weak') ? {
			level: -1,
			default: -2,
		} : {
			default: bumps.length > 0 ? 1 : 0,
			attack: bumps.includes('attack') ? 2 : undefined,
			ac: bumps.includes('ac') ? 2 : undefined,
			saves: bumps.includes('saves') ? 2 : undefined,
			skills: bumps.includes('skills') ? 2 : undefined,
			spells: bumps.includes('spells') ? 2 : undefined,
			perception: bumps.includes('perception') ? 2 : undefined,
		});
		const tsv = formatTSV(stats, secret, includeDefault);

		const message = await interaction.editReply({
			files: [new AttachmentBuilder(Buffer.from(tsv), { name: stats.alias + '.tsv' })],
			withResponse: true,
		});

		const attachmentUrl = message.attachments.first()?.url;

		if (attachmentUrl) {
			await interaction.editReply({
				content: `[Direct link](${attachmentUrl})`,
			});
		}
	},
};

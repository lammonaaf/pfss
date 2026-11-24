const { AttachmentBuilder, SlashCommandBuilder } = require('discord.js');
const { formatTSV, parsePathbuilder } = require('pf2e-sage-stats');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pathbuilder-tsv')
		.setDescription('Accept pathbuilder json and extracts it into character json.')
		.addAttachmentOption((option) =>
			option.setName('file').setDescription('A .json pathbuilder file').setRequired(false).setFileTypes('.json', '.txt'),
		)
		.addStringOption((option) =>
			option
				.setName('text')
				.setDescription('The json text.')
				.setRequired(false)
				.setMaxLength(6000),
		)
		.addStringOption((option) =>
			option
				.setName('id')
				.setDescription('The pathbuilder json id.')
				.setRequired(false)
				.setMaxLength(40),
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
		const id = interaction.options.getString('id') ?? null;
		const alias = interaction.options.getString('alias') ?? null;
		const bump = interaction.options.getString('bump') ?? null;
		const includeDefault = interaction.options.getBoolean('default') ?? false;
		const secret = interaction.options.getBoolean('secret') ?? false;

		const bumps = bump?.split(',').map((b) => b.trim().toLowerCase()) ?? [];

		let contents = null;

		if (attachment) {
			const name = attachment.name ?? 'file.json';

			if (!name.toLowerCase().endsWith('.json') && !name.toLowerCase().endsWith('.txt')) {
				await interaction.reply({
					content: 'Attach a file with a `.json` or `.txt` extension.',
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
		} else if (id) {
			await interaction.deferReply();

			const response = await fetch(`https://pathbuilder2e.com/json.php?id=${id}`);
			if (!response.ok) {
				console.log(response)
				await interaction.editReply({ content: 'Could not download the file.' });
				return;
			}

			contents = await response.text();
		} else {
			await interaction.editReply({ content: 'You should provide the json.' });
			return;
		}

		const stats = parsePathbuilder(contents, alias, bumps.includes('elite') ? {
			level: 1,
			deafult: 2,
		} : bumps.includes('weak') ? {
			level: -1,
			deafult: -2,
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
		});

		const attachmentUrl = message.attachments.first()?.url;

		if (attachmentUrl) {
			await interaction.editReply({
				content: `[Direct link](${attachmentUrl})`,
			});
		}
	},
};

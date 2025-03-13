const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, Role, User } = require('discord.js');
const Website = require('../models/Website');

module.exports = {
		data: new SlashCommandBuilder()
				.setName('addwebsite')
				.setDescription('Add a website to monitor.')
				.addStringOption(option =>
						option.setName('name')
								.setDescription('A unique name for this website')
								.setRequired(true))
				.addStringOption(option =>
						option.setName('url')
								.setDescription('The website URL to monitor')
								.setRequired(true))
				.addChannelOption(option =>
						option.setName('status-channel')
								.setDescription('The channel to send status updates in')
								.setRequired(true))
				.addChannelOption(option =>
						option.setName('alert-channel')
								.setDescription('(Optional) The channel to send alerts if the website goes offline')
								.setRequired(false))
				.addMentionableOption(option =>
						option.setName('mention')
								.setDescription('(Optional) User or role to mention on status changes')
								.setRequired(false))
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
		async execute(interaction) {
				try {
					await interaction.deferReply({ flags: MessageFlags.Ephemeral });

						const { guild, member, options } = interaction;

						if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
								return interaction.editReply("❌ You need **Administrator** permission to add a website.");
						}

						const name = options.getString('name').trim();
						let url = options.getString('url').trim();
						const statusChannel = options.getChannel('status-channel');
						const alertChannel = options.getChannel('alert-channel');
						const mention = options.getMentionable('mention');

						if (!statusChannel || !statusChannel.isTextBased()) {
								return interaction.editReply('❌ Please select a valid text channel for status updates.');
						}
						if (alertChannel && !alertChannel.isTextBased()) {
								return interaction.editReply('❌ Please select a valid text channel for alerts.');
						}

						if (!/^https?:\/\//.test(url)) {
								url = `https://${url}`;
						}

						const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/;
						if (!urlPattern.test(url)) {
								return interaction.editReply('❌ Please enter a **valid URL** (e.g., https://example.com).');
						}

						const existingWebsites = await Website.find({ guildID: guild.id });
						if (existingWebsites.some(site => site.name === name)) {
								return interaction.editReply(`⚠️ A website with the name **${name}** is already being monitored.`);
						}
						if (existingWebsites.some(site => site.websiteURL === url)) {
								return interaction.editReply(`⚠️ The website **${url}** is already being monitored.`);
						}

						let mentionID = null;
						let mentionText = "None";

						if (mention) {
								mentionID = mention.id;

								if (mention instanceof Role) {
										mentionText = `<@&${mentionID}>`;
								} else if (mention instanceof User) {
										mentionText = `<@${mentionID}>`;
								} else {
										mentionText = "Invalid mention";
								}
						}

						const newWebsite = new Website({
								guildID: guild.id,
								name,
								websiteURL: url,
								statusChannelID: statusChannel.id,
								alertChannelID: alertChannel ? alertChannel.id : statusChannel.id,
								mentionID
						});

						await newWebsite.save();

						await interaction.editReply({
								embeds: [{
										title: "✅ Website Added!",
										description: `🔹 **Name:** ${name}\n🔹 **URL:** [${url}](${url})\n🔹 **Status Updates:** <#${statusChannel.id}>\n🔹 **Alerts:** <#${alertChannel ? alertChannel.id : statusChannel.id}> (Mention: ${mentionText})`,
										color: 0x00ff00
								}]
						});

				} catch (error) {
						console.error('❌ Error in /addwebsite:', error);
						await interaction.editReply('⚠️ An unexpected error occurred. Please check the logs.');
				}
		}
};

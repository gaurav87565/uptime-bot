const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Website = require('../models/Website');

module.exports = {
		data: new SlashCommandBuilder()
				.setName('listwebsites')
				.setDescription('List all monitored websites for this server'),

		async execute(interaction) {
				try {
						await interaction.deferReply();

						const websites = await Website.find({ guildID: interaction.guild.id });

						if (websites.length === 0) {
								return await interaction.editReply('📭 No websites are currently being monitored.');
						}

						const websiteChunks = [];
						let currentChunk = "";

						websites.forEach(site => {
								const siteEntry = `🔹 **${site.name}**\n🔗 [${site.websiteURL}](${site.websiteURL})\n📢 Alerts in <#${site.alertChannelID}>\n\n`;

								if (currentChunk.length + siteEntry.length > 4000) {
										websiteChunks.push(currentChunk);
										currentChunk = siteEntry;
								} else {
										currentChunk += siteEntry;
								}
						});

						websiteChunks.push(currentChunk);

						const embeds = websiteChunks.map((chunk, index) => new EmbedBuilder()
								.setTitle(index === 0 ? "🌐 Monitored Websites" : "🌐 Continued...")
								.setDescription(chunk)
								.setColor(0x0099ff)
								.setFooter({ text: `Total Websites: ${websites.length}` })
						);

						await interaction.editReply({ embeds });

				} catch (error) {
						console.error("❌ Error in /listwebsites:", error);
						await interaction.editReply('⚠️ An error occurred while fetching the list.');
				}
		}
};

const { EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const Website = require('./models/Website');
const axios = require('axios');
require('dotenv').config();

async function connectDB() {
		try {
			await mongoose.connect(process.env.MONGO_URI);
				console.log('✅ Connected to MongoDB!');
		} catch (error) {
				console.error('❌ MongoDB connection error:', error);
		}
}

const websiteStatus = new Map();

async function checkAllWebsites(client) {
		const websites = await Website.find();

		const groupedWebsites = websites.reduce((groups, site) => {
				if (!groups[site.statusChannelID]) {
						groups[site.statusChannelID] = [];
				}
				groups[site.statusChannelID].push(site);
				return groups;
		}, {});

		for (const channelID in groupedWebsites) {
				await updateStatusMessage(client, channelID, groupedWebsites[channelID]);
		}
}

async function updateStatusMessage(client, channelID, sites) {
		try {
				const channel = await client.channels.fetch(channelID).catch(() => null);
				if (!channel) return;

				let description = '';
				let anySiteDown = false;

				for (const site of sites) {
						let status = '🟢 Online';
						let responseTime = 'N/A';
						let isDown = false;

						try {
								const startTime = Date.now();
								const response = await axios.get(site.websiteURL, { timeout: 5000 });
								responseTime = `${Date.now() - startTime}ms`;
								if (!response.status || response.status >= 400) {
										status = '🔴 Offline';
										isDown = true;
								}
						} catch (error) {
								status = '🔴 Offline';
								isDown = true;
						}

						description += `🔹 **${site.name}**\n   🌐 [Visit Site](${site.websiteURL})\n   **Status:** ${status} | ⏳ ${responseTime}\n\n`;

						const previousStatus = websiteStatus.get(site.websiteURL) || '🟢 Online';

						if (isDown && previousStatus !== '🔴 Offline') {
								await notifyDowntime(site, client);
						}

						websiteStatus.set(site.websiteURL, status);
						if (isDown) anySiteDown = true;
				}

				const embed = new EmbedBuilder()
						.setTitle('🌐 Website Monitor')
						.setDescription(description)
						.setColor(anySiteDown ? 0xff0000 : 0x00ff00)
						.setTimestamp()
						.setFooter({ text: 'Last Update' });

				let lastMessageID = sites[0].lastMessageID;

				if (lastMessageID) {
						try {
								const lastMessage = await channel.messages.fetch(lastMessageID).catch(() => null);
								if (lastMessage) {
										await lastMessage.edit({ embeds: [embed] });
										return;
								}
						} catch (fetchError) {
								console.warn(`⚠️ Could not fetch last message for ${channelID}, sending a new one.`);
						}
				}

				const sentMessage = await channel.send({ embeds: [embed] });

				for (const site of sites) {
						site.lastMessageID = sentMessage.id;
						await site.save();
				}
		} catch (error) {
				console.error(`❌ Failed to send update for channel ${channelID}:`, error);
		}
}

async function notifyDowntime(website, client) {
		try {
				const guild = await client.guilds.fetch(website.guildID).catch(() => null);
				if (!guild) return;

				const alertChannel = website.alertChannelID 
						? await guild.channels.fetch(website.alertChannelID).catch(() => null) 
						: null;

				const statusChannel = await guild.channels.fetch(website.statusChannelID).catch(() => null);

				const targetChannel = alertChannel || statusChannel;
				if (!targetChannel) return;

				const mentionText = website.mentionID 
						? (guild.roles.cache.has(website.mentionID) ? `<@&${website.mentionID}>` : `<@${website.mentionID}>`) 
						: '';

				const embed = new EmbedBuilder()
						.setTitle(`⚠️ Website Down: ${website.name}`)
						.setDescription(`🌐 **[Visit Site](${website.websiteURL})**\n❌ **Status:** Offline\n\nWe will notify again when it is back online.`)
						.setColor(0xff0000)
						.setFooter({ text: "Monitoring System" });

				await targetChannel.send({ content: `${mentionText} ⚠️ Noticed recent downtime on the website: **${website.name}**`, embeds: [embed] });

		} catch (error) {
				console.error("Error sending downtime alert:", error);
		}
}

function startMonitoring(client) {
		connectDB();
		setInterval(() => checkAllWebsites(client), 60000);
}

module.exports = { startMonitoring };

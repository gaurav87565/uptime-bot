const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Website = require('../models/Website');

module.exports = {
		data: new SlashCommandBuilder()
				.setName('removewebsite')
				.setDescription('Remove a monitored website')
				.addStringOption(option =>
						option.setName('identifier')
								.setDescription('Website name or URL to remove')
								.setRequired(true)
				)
				.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

		async execute(interaction) {
				try {
						await interaction.deferReply();

						if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
								return interaction.editReply("❌ You need **Administrator** permission to remove a website.");
						}

						const identifier = interaction.options.getString('identifier');

						let deleted = await Website.findOneAndDelete({ 
								guildID: interaction.guild.id, 
								name: { $regex: new RegExp(`^${identifier}$`, 'i') }
						});

						if (!deleted) {
								deleted = await Website.findOneAndDelete({ 
										guildID: interaction.guild.id, 
										websiteURL: identifier
								});
						}

						if (deleted) {
								await interaction.editReply(`🗑️ Successfully removed **${deleted.name || deleted.websiteURL}** from monitoring.`);
						} else {
								await interaction.editReply(`❌ No monitored website found with name or URL **${identifier}**.`);
						}

				} catch (error) {
						console.error("❌ Error in /removewebsite:", error);
						await interaction.editReply('⚠️ An error occurred while removing the website.');
				}
		}
};

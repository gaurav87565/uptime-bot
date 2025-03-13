require('dotenv').config();
const { Client, GatewayIntentBits, Collection, InteractionResponseFlags } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const { startMonitoring } = require('./monitor');

const client = new Client({
		intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildMembers
		]
});

client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
		const command = require(`./commands/${file}`);
		client.commands.set(command.data.name, command);
}

async function connectDB() {
		try {
			await mongoose.connect(process.env.MONGO_URI);
				console.log('✅ Connected to MongoDB!');
		} catch (error) {
				console.error('❌ MongoDB connection error:', error);
				process.exit(1);
		}
}

connectDB();

client.once('ready', () => {
		console.log(`✅ Bot is online as ${client.user.tag}`);
		startMonitoring(client);
});

client.on('interactionCreate', async (interaction) => {
		if (!interaction.isCommand()) return;

		const command = client.commands.get(interaction.commandName);
		if (!command) return;

		try {
				await command.execute(interaction);
		} catch (error) {
				console.error(`❌ Error executing ${interaction.commandName}:`, error);
				try {
						await interaction.reply({ content: '⚠️ An error occurred while executing this command.', flags: 64 });
				} catch {
						await interaction.editReply({ content: '⚠️ An error occurred while executing this command.' });
				}
		}
});

client.login(process.env.TOKEN)
		.then(() => console.log('✅ Successfully logged in!'))
		.catch((error) => {
				console.error('❌ Failed to log in:', error);
				process.exit(1);
		});

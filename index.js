require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const { startMonitoring } = require('./monitor');

// Express server for Render (prevents "No open ports detected" error)
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(PORT, () => console.log(`🌐 Express server running on port ${PORT}`));

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Command handling
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

// MongoDB connection
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB!');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
}

// Bot Ready Event
client.once('ready', () => {
    console.log(`✅ Bot is online as ${client.user.tag}`);
    startMonitoring(client);
});

// Interaction Handling
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ Error executing ${interaction.commandName}:`, error);
        try {
            await interaction.reply({ content: '⚠️ An error occurred while executing this command.', ephemeral: true });
        } catch {
            await interaction.editReply({ content: '⚠️ An error occurred while executing this command.' });
        }
    }
});

// Login bot
client.login(process.env.TOKEN)
    .then(() => {
        console.log('✅ Successfully logged in!');
        connectDB(); // Connect to MongoDB after successful login
    })
    .catch((error) => {
        console.error('❌ Failed to log in:', error);
        process.exit(1);
    });

const mongoose = require('mongoose');

const websiteSchema = new mongoose.Schema({
		guildID: { type: String, required: true },
		name: { type: String, required: true },
		websiteURL: { type: String, required: true },
		statusChannelID: { type: String, required: true },
		alertChannelID: { type: String, default: null },
		mentionID: { type: String, default: null },
		lastMessageID: { type: String, default: null },
}, { timestamps: true });

websiteSchema.index({ guildID: 1, websiteURL: 1 }, { unique: true });

module.exports = mongoose.model('Website', websiteSchema);

const express = require('express');
const app = express();

const PORT = process.env.port || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(PORT, () => {
    console.log(`✅ Web server running on port ${port}`);
});

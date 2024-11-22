const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const dataFile = path.join(__dirname, 'data.json');
const chatFile = path.join(__dirname, 'chat.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Initialize the data file if it doesn't exist
if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify({ polls: [], votes: [] }, null, 2));
}
if (!fs.existsSync(chatFile)) {
    fs.writeFileSync(chatFile, JSON.stringify({ messages: [] }, null, 2));
}

// Helper functions to read and write data
function readData() {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

function writeData(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

function readChat() {
    return JSON.parse(fs.readFileSync(chatFile, 'utf8'));
}

function writeChat(chat) {
    fs.writeFileSync(chatFile, JSON.stringify(chat, null, 2));
}

// Routes
// Get all polls
app.get('/polls', (req, res) => {
    const data = readData();
    res.json(data.polls);
});

// Create a new poll
app.post('/polls', (req, res) => {
    const { title, description, options, poster } = req.body;

    if (!title || !description || !options || options.length < 2 || !poster) {
        return res.status(400).json({ error: 'Invalid poll data. Title, description, options, and poster address are required.' });
    }

    const data = readData();
    const newPoll = {
        id: Date.now(),
        title,
        description,
        options,
        votes: Array(options.length).fill(0),
        poster, // Save the poster's wallet address
    };

    data.polls.push(newPoll);
    writeData(data);

    res.status(201).json(newPoll);
});

// Vote on a poll
app.post('/polls/:id/vote', (req, res) => {
    const { id } = req.params;
    const { wallet, option } = req.body;

    if (!wallet || option === undefined) {
        return res.status(400).json({ error: 'Invalid vote data. Wallet address and option are required.' });
    }

    const data = readData();
    const poll = data.polls.find((poll) => poll.id == id);

    if (!poll) {
        return res.status(404).json({ error: 'Poll not found.' });
    }

    const hasVoted = data.votes.find((vote) => vote.wallet === wallet && vote.pollId == id);
    if (hasVoted) {
        return res.status(400).json({ error: 'You have already voted on this poll.' });
    }

    if (option < 0 || option >= poll.options.length) {
        return res.status(400).json({ error: 'Invalid option index.' });
    }

    poll.votes[option]++;
    data.votes.push({ wallet, pollId: id });

    writeData(data);

    res.json({ message: 'Vote registered.', poll });
});

// Get all chat messages
app.get('/chat', (req, res) => {
    const chat = readChat();
    res.json(chat.messages);
});

// Post a new chat message
app.post('/chat', (req, res) => {
    const { wallet, text } = req.body;

    if (!wallet || !text) {
        return res.status(400).json({ error: 'Invalid message data. Wallet address and message text are required.' });
    }

    const chat = readChat();
    const newMessage = {
        id: Date.now(),
        wallet,
        text
    };

    chat.messages.push(newMessage);
    writeChat(chat);

    res.status(201).json(newMessage);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

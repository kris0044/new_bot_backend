import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://new-bot-frontend.onrender.com',
  'http://localhost:3000',
  'https://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS policy does not allow access from ${origin}`));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const PromptSchema = new mongoose.Schema({
  prompt: String,
  response: String,
  timestamp: { type: Date, default: Date.now }
});

const Prompt = mongoose.model('Prompt', PromptSchema);

// POST /api/ask-ai - Send prompt to AI and get response
app.post('/api/ask-ai', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Referer': process.env.FRONTEND_URL || 'https://new-bot-frontend.onrender.com',
        'X-OpenRouter-Title': 'MERN AI Chat App',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openrouter/auto',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenRouter API error:', errorData);
      return res.status(response.status).json({ error: errorData.error?.message || 'Failed to call OpenRouter API' });
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Error calling OpenRouter:', error);
    res.status(500).json({ error: error.message || 'Failed to get AI response' });
  }
});

// POST /api/save - Save prompt and response to database
app.post('/api/save', async (req, res) => {
  const { prompt, response } = req.body;
  if (!prompt || !response) {
    return res.status(400).json({ error: 'Prompt and response are required' });
  }
  try {
    const newPrompt = new Prompt({ prompt, response });
    await newPrompt.save();
    res.json({ message: 'Saved successfully', id: newPrompt._id });
  } catch (error) {
    console.error('Error saving to database:', error);
    res.status(500).json({ error: 'Failed to save' });
  }
});

// GET /api/conversations - Retrieve all saved conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const conversations = await Prompt.find().sort({ timestamp: -1 });
    res.json(conversations);
  } catch (error) {
    console.error('Error retrieving conversations:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations' });
  }
});

// DELETE /api/conversations/:id - Delete a conversation
app.delete('/api/conversations/:id', async (req, res) => {
  try {
    await Prompt.findByIdAndDelete(req.params.id);
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`OpenRouter API configured with model: openrouter/auto`);
});

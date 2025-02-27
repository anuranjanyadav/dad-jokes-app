import express from 'express';
import { pool } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

app.use(express.static('public'));
app.use(express.json());  // for parsing application/json

// Function to calculate similarity between two strings
function stringSimilarity(str1, str2) {
    str1 = str1.toLowerCase();
    str2 = str2.toLowerCase();
    
    if (str1 === str2) return 1.0;
    
    const len1 = str1.length;
    const len2 = str2.length;
    
    const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
    
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    
    return 1 - (matrix[len1][len2] / Math.max(len1, len2));
}

// 1. Joke Validation Function
async function validateWithAI(setup, punchline) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a dad joke expert. Evaluate if the given joke is a proper dad joke (should be family-friendly and contain wordplay/puns). Respond with JSON: {\"valid\": boolean, \"reason\": string}"
                },
                {
                    role: "user",
                    content: `Setup: ${setup}\nPunchline: ${punchline}`
                }
            ],
            temperature: 0.3
        });
        
        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        console.error('AI Validation Error:', error);
        return { valid: false, reason: "Error validating joke" };
    }
}

// 2. Joke Generation Function
async function generateDadJoke() {
    try {
        console.log('Calling OpenAI API...'); // Debug log
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a dad joke expert. Generate a family-friendly dad joke with wordplay/puns. Respond with JSON: {\"setup\": string, \"punchline\": string}"
                },
                {
                    role: "user",
                    content: "Generate a dad joke"
                }
            ],
            temperature: 0.7
        });
        
        console.log('OpenAI response:', completion.choices[0].message.content); // Debug log
        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        console.error('AI Generation Error:', error);
        throw error;
    }
}

// Serve random joke
app.get('/api/jokes/random', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, setup, punchline, is_ai_generated FROM jokes ORDER BY RANDOM() LIMIT 1');
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch joke' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Update the check endpoint to use AI validation
app.post('/api/jokes/check', async (req, res) => {
    try {
        const { setup, punchline } = req.body;
        
        // First check for similarity with existing jokes
        const result = await pool.query('SELECT setup, punchline FROM jokes');
        
        for (const joke of result.rows) {
            const setupSimilarity = stringSimilarity(setup, joke.setup);
            const punchlineSimilarity = stringSimilarity(punchline, joke.punchline);
            
            if (setupSimilarity > 0.8 || punchlineSimilarity > 0.8) {
                return res.json({ 
                    valid: false, 
                    message: 'A similar joke already exists!' 
                });
            }
        }
        
        // Then use AI to validate the joke
        const aiValidation = await validateWithAI(setup, punchline);
        if (!aiValidation.valid) {
            return res.json({
                valid: false,
                message: aiValidation.reason
            });
        }
        
        res.json({ valid: true });
    } catch (error) {
        console.error('Error checking joke:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Endpoint to submit a new joke
app.post('/api/jokes/submit', async (req, res) => {
    try {
        const { setup, punchline } = req.body;
        const result = await pool.query(
            'INSERT INTO jokes (setup, punchline, is_ai_generated) VALUES ($1, $2, FALSE) RETURNING *',
            [setup, punchline]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to submit joke' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 
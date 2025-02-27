import express from 'express';
import { pool } from './db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { OpenAI } from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));

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

// Simple validation for dad jokes
function validateDadJoke(setup, punchline) {
    // Convert to lowercase for checking
    const lowercaseSetup = setup.toLowerCase();
    const lowercasePunchline = punchline.toLowerCase();
    
    // Basic validation rules
    const validationRules = {
        // Check if setup is a question
        hasQuestion: setup.includes('?'),
        
        // Check minimum lengths
        validLength: setup.length >= 10 && punchline.length >= 3,
        
        // Check for common dad joke patterns
        hasWordplay: false,
        
        // Check for inappropriate content
        isClean: true
    };

    // List of inappropriate words (add more as needed)
    const inappropriateWords = ['damn', 'hell', 'crap'];
    
    // Check for inappropriate words
    inappropriateWords.forEach(word => {
        if (lowercaseSetup.includes(word) || lowercasePunchline.includes(word)) {
            validationRules.isClean = false;
        }
    });
    
    // Common dad joke patterns (add more as needed)
    const wordplayPatterns = [
        'what do you call',
        'why did',
        'what did',
        'how do you',
        'when does'
    ];
    
    // Check for dad joke patterns
    wordplayPatterns.forEach(pattern => {
        if (lowercaseSetup.includes(pattern)) {
            validationRules.hasWordplay = true;
        }
    });

    // Return validation result
    if (!validationRules.isClean) {
        return {
            valid: false,
            message: 'Please keep jokes family-friendly!'
        };
    }
    
    if (!validationRules.hasQuestion) {
        return {
            valid: false,
            message: 'Setup should be a question ending with "?"'
        };
    }
    
    if (!validationRules.validLength) {
        return {
            valid: false,
            message: 'Setup and punchline are too short'
        };
    }
    
    if (!validationRules.hasWordplay) {
        return {
            valid: false,
            message: 'Try starting with "What do you call", "Why did", etc.'
        };
    }

    return { valid: true };
}

// Serve random joke
app.get('/api/jokes/random', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM jokes ORDER BY RANDOM() LIMIT 1');
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'No jokes found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Endpoint to check if a joke is valid and unique
app.post('/api/jokes/check', async (req, res) => {
    try {
        const { setup, punchline } = req.body;
        
        // First validate the joke format
        const validationResult = validateDadJoke(setup, punchline);
        if (!validationResult.valid) {
            return res.json(validationResult);
        }
        
        // Then check for similarity with existing jokes
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
            'INSERT INTO jokes (setup, punchline) VALUES ($1, $2) RETURNING *',
            [setup, punchline]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error submitting joke:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 
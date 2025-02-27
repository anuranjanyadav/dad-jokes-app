import { pool } from './db.js';
import OpenAI from 'openai';
import 'dotenv/config';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function generateDadJoke() {
    try {
        console.log('Generating new dad joke...');
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "system",
                    content: "You are a dad joke expert. Generate a family-friendly dad joke with wordplay/puns. The joke must be original and follow the setup/punchline format. Respond with JSON: {\"setup\": string, \"punchline\": string}"
                },
                {
                    role: "user",
                    content: "Generate a dad joke"
                }
            ],
            temperature: 0.8  // Slightly higher for more creativity
        });
        
        const joke = JSON.parse(completion.choices[0].message.content);
        console.log('Generated joke:', joke);
        return joke;
    } catch (error) {
        console.error('AI Generation Error:', error);
        throw error;
    }
}

async function checkJokeSimilarity(setup, punchline) {
    try {
        const result = await pool.query('SELECT setup, punchline FROM jokes');
        
        for (const existingJoke of result.rows) {
            // Simple string similarity check
            const setupSimilarity = setup.toLowerCase().includes(existingJoke.setup.toLowerCase()) ||
                                  existingJoke.setup.toLowerCase().includes(setup.toLowerCase());
            const punchlineSimilarity = punchline.toLowerCase().includes(existingJoke.punchline.toLowerCase()) ||
                                      existingJoke.punchline.toLowerCase().includes(punchline.toLowerCase());
            
            if (setupSimilarity && punchlineSimilarity) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Database Error:', error);
        throw error;
    }
}

async function addJokeToDB(joke) {
    try {
        const result = await pool.query(
            'INSERT INTO jokes (setup, punchline, is_ai_generated) VALUES ($1, $2, $3) RETURNING *',
            [joke.setup, joke.punchline, true]
        );
        console.log('Successfully added new AI joke:', result.rows[0]);
        return result.rows[0];
    } catch (error) {
        console.error('Database Error:', error);
        throw error;
    }
}

async function generateDailyJoke() {
    try {
        console.log('Starting daily joke generation process...');
        let joke;
        let isSimilar = true;
        let attempts = 0;
        const maxAttempts = 5;

        // Keep trying until we get a unique joke or reach max attempts
        while (isSimilar && attempts < maxAttempts) {
            attempts++;
            console.log(`Attempt ${attempts} of ${maxAttempts}`);
            
            joke = await generateDadJoke();
            isSimilar = await checkJokeSimilarity(joke.setup, joke.punchline);
            
            if (isSimilar) {
                console.log('Generated joke was too similar to existing one, trying again...');
            }
        }

        if (isSimilar) {
            throw new Error('Failed to generate a unique joke after maximum attempts');
        }

        await addJokeToDB(joke);
        console.log('Daily joke generation completed successfully');
    } catch (error) {
        console.error('Error in daily joke generation:', error);
    } finally {
        await pool.end();
    }
}

// Run the function
generateDailyJoke(); 
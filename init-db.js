import { pool } from './db.js';
import { jokes } from './jokes-data.js';

async function initializeDb() {
    const client = await pool.connect();
    
    try {
        // Create table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS jokes (
                id SERIAL PRIMARY KEY,
                setup TEXT NOT NULL,
                punchline TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Jokes table created successfully');

        // Check if table is empty
        const result = await client.query('SELECT COUNT(*) FROM jokes');
        const jokeCount = parseInt(result.rows[0].count);

        if (jokeCount < 20) {
            // Insert jokes only if table is empty
            await client.query('BEGIN');
            
            for (const joke of jokes) {
                await client.query(
                    'INSERT INTO jokes (setup, punchline) VALUES ($1, $2)',
                    [joke.setup, joke.punchline]
                );
            }
            
            await client.query('COMMIT');
            console.log(`Successfully inserted ${jokes.length} initial jokes`);
        } else {
            console.log(`Table already contains ${jokeCount} jokes, skipping insertion`);
        }

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error initializing database:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

initializeDb(); 
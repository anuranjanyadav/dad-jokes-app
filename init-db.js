import { pool } from './db.js';

async function initializeDb() {
    try {
        // Create jokes table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS jokes (
                id SERIAL PRIMARY KEY,
                setup TEXT NOT NULL,
                punchline TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Jokes table created successfully');

        // Insert initial jokes
        await pool.query(`
            INSERT INTO jokes (setup, punchline) VALUES
            ('What did the janitor say when he jumped out of the closet?', 'Supplies!'),
            ('What do you call a fish wearing a bowtie?', 'So-fish-ticated!'),
            ('What did the ocean say to the shore?', 'Nothing, it just waved!')
            ON CONFLICT DO NOTHING
        `);
        console.log('Initial jokes inserted successfully');

    } catch (err) {
        console.error('Error initializing database:', err);
    } finally {
        await pool.end();
    }
}

initializeDb(); 
import { pool } from './db.js';
import { jokes } from './jokes-data.js';

async function initializeDb() {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Add is_ai_generated column if it doesn't exist
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (
                    SELECT 1 
                    FROM information_schema.columns 
                    WHERE table_name='jokes' AND column_name='is_ai_generated'
                ) THEN 
                    ALTER TABLE jokes ADD COLUMN is_ai_generated BOOLEAN DEFAULT TRUE;
                END IF;
            END $$;
        `);
        
        // Update existing jokes to have is_ai_generated = true
        await client.query(`
            UPDATE jokes 
            SET is_ai_generated = TRUE 
            WHERE is_ai_generated IS NULL
        `);
        
        // Create jokes table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS jokes (
                id SERIAL PRIMARY KEY,
                setup TEXT NOT NULL,
                punchline TEXT NOT NULL,
                is_ai_generated BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create joke_views table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS joke_views (
                id SERIAL PRIMARY KEY,
                joke_id INT REFERENCES jokes(id),
                user_id VARCHAR(255),
                view_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create joke_statistics table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS joke_statistics (
                id SERIAL PRIMARY KEY,
                total_jokes_added INT DEFAULT 0,
                total_jokes_viewed INT DEFAULT 0,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Initialize the joke_statistics table with a single row if it's empty
        const statsResult = await client.query('SELECT COUNT(*) FROM joke_statistics');
        if (parseInt(statsResult.rows[0].count) === 0) {
            await client.query('INSERT INTO joke_statistics (total_jokes_added, total_jokes_viewed) VALUES (0, 0)');
        }

        // If table is empty, insert initial jokes as AI-generated
        const result = await client.query('SELECT COUNT(*) FROM jokes');
        const jokeCount = parseInt(result.rows[0].count);

        if (jokeCount === 0) {
            for (const joke of jokes) {
                await client.query(
                    'INSERT INTO jokes (setup, punchline, is_ai_generated) VALUES ($1, $2, TRUE)',
                    [joke.setup, joke.punchline]
                );
            }
            console.log(`Successfully inserted ${jokes.length} initial jokes`);
        } else {
            console.log(`Table already contains ${jokeCount} jokes, skipping insertion`);
        }
        
        await client.query('COMMIT');
        console.log('Database initialization completed successfully');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error initializing database:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

initializeDb(); 
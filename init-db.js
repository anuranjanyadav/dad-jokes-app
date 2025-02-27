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
        
        // Create table if not exists (for new installations)
        await client.query(`
            CREATE TABLE IF NOT EXISTS jokes (
                id SERIAL PRIMARY KEY,
                setup TEXT NOT NULL,
                punchline TEXT NOT NULL,
                is_ai_generated BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

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
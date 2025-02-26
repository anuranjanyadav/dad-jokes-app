import { pool } from './db.js';

async function insertJokes() {
    try {
        const client = await pool.connect();
        
        // Insert multiple jokes
        const insertQuery = `
            INSERT INTO jokes (setup, punchline) VALUES
            ('Why did the scarecrow win an award?', 'Because he was outstanding in his field!'),
            ('What do you call a bear with no teeth?', 'A gummy bear!'),
            ('Why don't eggs tell jokes?', 'They'd crack up!'),
            ('What do you call a fake noodle?', 'An impasta!'),
            ('Why did the cookie go to the doctor?', 'Because it was feeling crumbly!')
        `;

        await client.query(insertQuery);
        console.log('Successfully inserted jokes');
        
        // Verify the insertion by selecting all jokes
        const result = await client.query('SELECT * FROM jokes');
        console.log('Current jokes in database:', result.rows);
        
        client.release();
    } catch (err) {
        console.error('Error inserting jokes:', err);
    } finally {
        // Close the pool when done
        await pool.end();
    }
}

insertJokes(); 
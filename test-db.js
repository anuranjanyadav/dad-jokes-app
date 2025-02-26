import 'dotenv/config';
import { pool } from './db.js';

async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('Successfully connected to PostgreSQL');
        client.release();
    } catch (err) {
        console.error('Error connecting to PostgreSQL:', err);
    }
}

testConnection();
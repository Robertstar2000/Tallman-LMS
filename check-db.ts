
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, './tallman.db');
const db = new Database(dbPath);

try {
    const settings = db.prepare('SELECT * FROM system_settings').all();
    console.log('Settings:', settings);
} catch (err) {
    console.error('Error querying system_settings:', err);
}

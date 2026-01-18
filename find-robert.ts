
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, './tallman.db');
const db = new Database(dbPath);

const user = db.prepare('SELECT * FROM users WHERE email = ?').get('robertstar@aol.com');
console.log('Robert User:', user);

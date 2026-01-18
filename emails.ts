
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, './tallman.db');
const db = new Database(dbPath);

const users = db.prepare('SELECT email FROM users').all();
users.forEach(u => console.log(`'${u.email}'`));

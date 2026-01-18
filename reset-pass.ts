
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, './tallman.db');
const db = new Database(dbPath);

async function reset() {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hash, 'robertstar@aol.com');
    console.log('Admin password reset to password123');
}

reset();

import Database from 'better-sqlite3';
import pg from 'pg';
const { Pool } = pg;
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Industrial Persistence Registry
// Detects if we are running in a containerized Swarm environment or local dev
const isPostgres = !!process.env.DATABASE_URL || !!process.env.POSTGRES_HOST;

interface DatabaseProxy {
  query: (text: string, params?: any[]) => Promise<any>;
  run: (text: string, params?: any[]) => Promise<any>;
  get: (text: string, params?: any[]) => Promise<any>;
  all: (text: string, params?: any[]) => Promise<any[]>;
  transaction: (fn: () => Promise<void>) => Promise<void>;
  close: () => Promise<void>;
}

let sqlite: any;
let dbInstance: DatabaseProxy;

if (isPostgres) {
  // ... (keep postgres as is)
  console.log("🛠️ PERSISTENCE: Initializing PostgreSQL Cluster Nexus (Docker Swarm Mode)");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
  });

  const translateParams = (text: string) => {
    let index = 1;
    return text.replace(/\?/g, () => `$${index++}`);
  };

  dbInstance = {
    async query(text, params) { return pool.query(translateParams(text), params); },
    async run(text, params) { return pool.query(translateParams(text), params); },
    async get(text, params) {
      const res = await pool.query(translateParams(text), params);
      return res.rows[0];
    },
    async all(text, params) {
      const res = await pool.query(translateParams(text), params);
      return res.rows;
    },
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await fn();
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    },
    async close() { await pool.end(); }
  };
} else {
  console.log("🛠️ PERSISTENCE: Initializing Local SQLite Engine (Developer Mode)");
  sqlite = new Database(path.resolve(__dirname, '../tallman.db'));
  sqlite.pragma('foreign_keys = ON');

  dbInstance = {
    async query(text, params = []) { return sqlite.prepare(text).run(params); },
    async run(text, params = []) { return sqlite.prepare(text).run(params); },
    async get(text, params = []) { return sqlite.prepare(text).get(params); },
    async all(text, params = []) { return sqlite.prepare(text).all(params); },
    async transaction(fn) {
      const exec = sqlite.transaction(async (innerFn: () => Promise<void>) => { await innerFn(); });
      return exec(fn);
    },
    async close() { sqlite.close(); }
  };
}

export async function initDb() {
  // Common Schema Implementation
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT,
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      branch_id TEXT,
      department TEXT,
      last_login TEXT,
      status TEXT DEFAULT 'active',
      roles TEXT
    );

    CREATE TABLE IF NOT EXISTS branches (
      branch_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      primary_color TEXT,
      domain TEXT,
      logo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT
    );

    CREATE TABLE IF NOT EXISTS courses (
      course_id TEXT PRIMARY KEY,
      course_name TEXT NOT NULL,
      short_description TEXT,
      thumbnail_url TEXT,
      category_id TEXT,
      instructor_id TEXT,
      status TEXT,
      enrolled_count INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      difficulty TEXT,
      attachment_url TEXT,
      attachment_type TEXT
    );

    CREATE TABLE IF NOT EXISTS modules (
      module_id TEXT PRIMARY KEY,
      course_id TEXT REFERENCES courses(course_id) ON DELETE CASCADE,
      module_title TEXT NOT NULL,
      position INTEGER
    );

    CREATE TABLE IF NOT EXISTS lessons (
      lesson_id TEXT PRIMARY KEY,
      module_id TEXT REFERENCES modules(module_id) ON DELETE CASCADE,
      lesson_title TEXT NOT NULL,
      lesson_type TEXT,
      content TEXT,
      duration_minutes INTEGER,
      attachment_url TEXT,
      attachment_type TEXT
    );

    CREATE TABLE IF NOT EXISTS quiz_questions (
      id SERIAL PRIMARY KEY,
      lesson_id TEXT REFERENCES lessons(lesson_id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      options TEXT,
      correct_index INTEGER
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      enrollment_id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
      course_id TEXT REFERENCES courses(course_id) ON DELETE CASCADE,
      progress_percent INTEGER DEFAULT 0,
      status TEXT,
      enrolled_at TEXT
    );

    CREATE TABLE IF NOT EXISTS lesson_completions (
      user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
      lesson_id TEXT REFERENCES lessons(lesson_id) ON DELETE CASCADE,
      completed_at TEXT,
      PRIMARY KEY (user_id, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS mentorship_logs (
      id TEXT PRIMARY KEY,
      mentor_id TEXT REFERENCES users(user_id) ON UPDATE CASCADE,
      mentee_id TEXT,
      mentee_name TEXT,
      hours REAL,
      date TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS badges (
      badge_id TEXT PRIMARY KEY,
      badge_name TEXT NOT NULL,
      badge_image_url TEXT,
      criteria TEXT
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
      badge_id TEXT REFERENCES badges(badge_id) ON DELETE CASCADE,
      earned_at TEXT,
      PRIMARY KEY (user_id, badge_id)
    );

    CREATE TABLE IF NOT EXISTS forum_posts (
      id TEXT PRIMARY KEY,
      author_name TEXT NOT NULL,
      author_avatar TEXT,
      title TEXT NOT NULL,
      content TEXT,
      category TEXT,
      replies INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `;

  // Note: For Postgres, SERIAL and TEXT PRIMARY KEY work fine.
  // We strip SERIAL for SQLite if needed, but 'initDb' usually handles exec.
  if (isPostgres) {
    // Process schema for Postgres (Split and run sequentially)
    const statements = schema
      .replace(/SERIAL PRIMARY KEY/g, 'SERIAL PRIMARY KEY')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const sql of statements) {
      await dbInstance.query(sql);
    }
  } else {
    // Process for SQLite (replace SERIAL with INTEGER PRIMARY KEY AUTOINCREMENT)
    const sqliteSchema = schema.replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT');
    // better-sqlite3 uses .exec for multiple statements
    (dbInstance as any)._sqlite = (sqlite as any);
    sqlite.exec(sqliteSchema);
  }

  // Initialize default settings
  const checkSetting = await dbInstance.get('SELECT key FROM system_settings WHERE key = ?', ['external_url_active']);
  if (!checkSetting) {
    const defaults = [
      ['external_url_active', 'false'],
      ['external_url', ''],
      ['ai_safety_mode', 'true'],
      ['governance_level', 'High'],
      ['simulation_mode', 'false'],
      ['tunnel_password', 'industrial_secure_2026']
    ];
    for (const [k, v] of defaults) {
      await dbInstance.run('INSERT INTO system_settings (key, value) VALUES (?, ?)', [k, v]);
    }
  }

  console.log('Industrial Persistence Registry Synchronized.');
}

export default dbInstance;

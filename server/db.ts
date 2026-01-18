import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../tallman.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  // Users Table
  db.exec(`
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
      roles TEXT -- JSON array
    )
  `);

  // Migration: Add status column if not exists
  try {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
  } catch (e) {
    // Column might already exist
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      branch_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      primary_color TEXT,
      domain TEXT,
      logo_url TEXT
    )
  `);

  // Categories Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT
    )
  `);

  // Courses Table
  db.exec(`
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
      FOREIGN KEY (category_id) REFERENCES categories(id)
    )
  `);

  // Modules Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS modules (
      module_id TEXT PRIMARY KEY,
      course_id TEXT,
      module_title TEXT NOT NULL,
      position INTEGER,
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
    )
  `);

  // Lessons Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS lessons (
      lesson_id TEXT PRIMARY KEY,
      module_id TEXT,
      lesson_title TEXT NOT NULL,
      lesson_type TEXT,
      content TEXT,
      duration_minutes INTEGER,
      FOREIGN KEY (module_id) REFERENCES modules(module_id) ON DELETE CASCADE
    )
  `);

  // Quiz Questions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lesson_id TEXT,
      question TEXT NOT NULL,
      options TEXT, -- JSON array
      correct_index INTEGER,
      FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE
    )
  `);

  // Enrollments Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS enrollments (
      enrollment_id TEXT PRIMARY KEY,
      user_id TEXT,
      course_id TEXT,
      progress_percent INTEGER DEFAULT 0,
      status TEXT,
      enrolled_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
    )
  `);

  // Lesson Completions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS lesson_completions (
      user_id TEXT,
      lesson_id TEXT,
      completed_at TEXT,
      PRIMARY KEY (user_id, lesson_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (lesson_id) REFERENCES lessons(lesson_id) ON DELETE CASCADE
    )
  `);

  // Mentorship Logs Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS mentorship_logs (
      id TEXT PRIMARY KEY,
      mentor_id TEXT,
      mentee_id TEXT,
      mentee_name TEXT,
      hours REAL,
      date TEXT,
      notes TEXT,
      FOREIGN KEY (mentor_id) REFERENCES users(user_id)
    )
  `);

  // Badges Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS badges (
      badge_id TEXT PRIMARY KEY,
      badge_name TEXT NOT NULL,
      badge_image_url TEXT,
      criteria TEXT
    )
  `);

  // User Badges (Linkage)
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_badges (
      user_id TEXT,
      badge_id TEXT,
      earned_at TEXT,
      PRIMARY KEY (user_id, badge_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (badge_id) REFERENCES badges(badge_id) ON DELETE CASCADE
    )
  `);

  // Forum Posts Table
  db.exec(`
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
    )
  `);

  // System Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT -- JSON or string
    )
  `);

  // Initialize default settings
  const insertSetting = db.prepare('INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)');
  insertSetting.run('external_url_active', 'false');
  insertSetting.run('external_url', '');
  insertSetting.run('ai_safety_mode', 'true');
  insertSetting.run('governance_level', 'High');
  insertSetting.run('simulation_mode', 'false');
  insertSetting.run('tunnel_password', 'industrial_secure_2026');

  console.log('Database tables initialized.');
}

export default db;

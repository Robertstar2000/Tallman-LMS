import db, { initDb } from './db.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INITIAL_USERS = [
    {
        user_id: 'u_admin',
        display_name: 'Robert Star',
        email: 'robertstar@aol.com',
        avatar_url: '',
        points: 2500,
        level: 12,
        branch_id: 'Addison',
        department: 'Governance',
        roles: ['Admin', 'Instructor', 'Learner'],
        password: 'password123', // Added to match existing seed logic
        status: 'active' // Added to match existing seed logic
    },
    {
        user_id: 'u_instructor',
        display_name: 'Bob Miller',
        email: 'BobM@tallmanequipment.com',
        avatar_url: '',
        points: 1800,
        level: 8,
        branch_id: 'Addison',
        department: 'Safety Compliance',
        roles: ['Instructor', 'Learner'],
        password: 'password123', // Added to match existing seed logic
        status: 'active' // Added to match existing seed logic
    },
    {
        user_id: 'u_manager',
        display_name: 'Sarah Chen',
        email: 'sarah.c@tallmanequipment.com',
        avatar_url: '',
        points: 1200,
        level: 5,
        branch_id: 'Columbus',
        department: 'Operations',
        roles: ['Manager', 'Learner'],
        password: 'password123', // Added to match existing seed logic
        status: 'active' // Added to match existing seed logic
    },
    {
        user_id: 'u_learner',
        display_name: 'John Doe',
        email: 'john.d@tallmanequipment.com',
        avatar_url: '',
        points: 450,
        level: 2,
        branch_id: 'Lake City',
        department: 'Field Service',
        roles: ['Learner'],
        password: 'password123', // Added to match existing seed logic
        status: 'active' // Added to match existing seed logic
    }
];

async function seed() {
    initDb();

    const salt = await bcrypt.genSalt(10);

    // Load Data
    const branches = JSON.parse(fs.readFileSync(path.join(__dirname, 'branches-seed.json'), 'utf8'));
    const categories = JSON.parse(fs.readFileSync(path.join(__dirname, 'categories-seed.json'), 'utf8'));
    const courses = JSON.parse(fs.readFileSync(path.join(__dirname, 'courses-seed.json'), 'utf8'));
    const badges = JSON.parse(fs.readFileSync(path.join(__dirname, 'badges-seed.json'), 'utf8'));
    const forumPosts = JSON.parse(fs.readFileSync(path.join(__dirname, 'forum-seed.json'), 'utf8'));
    const mentorshipLogs = JSON.parse(fs.readFileSync(path.join(__dirname, 'mentorship-seed.json'), 'utf8'));
    const userBadges = JSON.parse(fs.readFileSync(path.join(__dirname, 'user-badges-seed.json'), 'utf8'));

    // Seed Branches
    const insertBranch = db.prepare('INSERT OR REPLACE INTO branches (branch_id, name, primary_color, domain) VALUES (?, ?, ?, ?)');
    for (const b of branches) {
        insertBranch.run(b.branch_id, b.name, b.primary_color, b.domain);
    }

    // Seed Categories
    const insertCategory = db.prepare('INSERT OR REPLACE INTO categories (id, name, icon) VALUES (?, ?, ?)');
    for (const c of categories) {
        insertCategory.run(c.id, c.name, c.icon);
    }

    // Seed Badges
    const insertBadge = db.prepare('INSERT OR REPLACE INTO badges (badge_id, badge_name, badge_image_url, criteria) VALUES (?, ?, ?, ?)');
    for (const b of badges) {
        insertBadge.run(b.badge_id, b.badge_name, b.badge_image_url, b.criteria);
    }

    // Seed Forum Posts
    const insertPost = db.prepare('INSERT OR REPLACE INTO forum_posts (id, author_name, author_avatar, title, content, category, replies, is_pinned, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    for (const p of forumPosts) {
        insertPost.run(p.id, p.author_name, p.author_avatar, p.title, p.content, p.category, p.replies, p.is_pinned ? 1 : 0, p.timestamp);
    }

    // Seed Mentorship
    const insertMentorship = db.prepare('INSERT OR REPLACE INTO mentorship_logs (id, mentor_id, mentee_id, mentee_name, hours, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    for (const m of mentorshipLogs) {
        insertMentorship.run(m.id, m.mentor_id, m.mentee_id, m.mentee_name, m.hours, m.date, m.notes);
    }

    // Seed Users
    const insertUser = db.prepare(`
    INSERT OR REPLACE INTO users (user_id, display_name, email, password_hash, avatar_url, points, level, branch_id, department, roles, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    for (const u of INITIAL_USERS) {
        const hash = await bcrypt.hash(u.password, salt);
        insertUser.run(u.user_id, u.display_name, u.email, hash, u.avatar_url, u.points, u.level, u.branch_id, u.department, JSON.stringify(u.roles), (u as any).status || 'active');
    }

    // Seed User Badges
    const insertUserBadge = db.prepare('INSERT OR REPLACE INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)');
    for (const ub of userBadges) {
        insertUserBadge.run(ub.user_id, ub.badge_id, ub.earned_at);
    }

    // Seed Courses, Modules, and Lessons
    const insertCourse = db.prepare(`
    INSERT OR REPLACE INTO courses (course_id, course_name, short_description, thumbnail_url, category_id, instructor_id, status, enrolled_count, rating, difficulty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    const insertModule = db.prepare(`
    INSERT OR REPLACE INTO modules (module_id, course_id, module_title, position)
    VALUES (?, ?, ?, ?)
  `);
    const insertLesson = db.prepare(`
    INSERT OR REPLACE INTO lessons (lesson_id, module_id, lesson_title, lesson_type, content, duration_minutes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
    const insertQuiz = db.prepare(`
    INSERT OR REPLACE INTO quiz_questions (lesson_id, question, options, correct_index)
    VALUES (?, ?, ?, ?)
  `);

    for (const c of courses) {
        insertCourse.run(c.course_id, c.course_name, c.short_description, c.thumbnail_url, c.category_id, c.instructor_id, c.status, c.enrolled_count, c.rating, c.difficulty);

        if (c.modules) {
            for (const mod of c.modules) {
                insertModule.run(mod.module_id, c.course_id, mod.module_title, mod.position);
                if (mod.lessons) {
                    for (const lesson of mod.lessons) {
                        insertLesson.run(lesson.lesson_id, mod.module_id, lesson.lesson_title, lesson.lesson_type, lesson.content || '', lesson.duration_minutes);
                        if (lesson.quiz_questions) {
                            // Clear existing quiz questions for this lesson to avoid duplicates if re-seeding
                            db.prepare('DELETE FROM quiz_questions WHERE lesson_id = ?').run(lesson.lesson_id);
                            for (const q of lesson.quiz_questions) {
                                insertQuiz.run(lesson.lesson_id, q.question, JSON.stringify(q.options), q.correct_index);
                            }
                        }
                    }
                }
            }
        }
    }

    console.log('Seeding completed successfully from JSON registry.');
}

seed().catch(console.error);


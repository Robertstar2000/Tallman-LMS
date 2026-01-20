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
        password: 'Rm2214ri#',
        status: 'active'
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
        password: 'Rm2214ri#',
        status: 'active'
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
        password: 'Rm2214ri#',
        status: 'active'
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
        password: 'Rm2214ri#',
        status: 'active'
    }
];

async function seed() {
    await initDb();

    const salt = await bcrypt.genSalt(10);

    // Load Data
    const branches = JSON.parse(fs.readFileSync(path.join(__dirname, 'branches-seed.json'), 'utf8'));
    const categories = JSON.parse(fs.readFileSync(path.join(__dirname, 'categories-seed.json'), 'utf8'));
    const courses = JSON.parse(fs.readFileSync(path.join(__dirname, 'courses-seed.json'), 'utf8'));
    const badges = JSON.parse(fs.readFileSync(path.join(__dirname, 'badges-seed.json'), 'utf8'));
    const forumPosts = JSON.parse(fs.readFileSync(path.join(__dirname, 'forum-seed.json'), 'utf8'));
    const mentorshipLogs = JSON.parse(fs.readFileSync(path.join(__dirname, 'mentorship-seed.json'), 'utf8'));
    const userBadges = JSON.parse(fs.readFileSync(path.join(__dirname, 'user-badges-seed.json'), 'utf8'));

    console.log("🌱 STARTING SEED: Synchronizing Industrial Records...");

    // Seed Branches
    for (const b of branches) {
        await db.run('INSERT INTO branches (branch_id, name, primary_color, domain) VALUES (?, ?, ?, ?) ON CONFLICT(branch_id) DO NOTHING', [b.branch_id, b.name, b.primary_color, b.domain]);
    }

    // Seed Categories
    for (const c of categories) {
        await db.run('INSERT INTO categories (id, name, icon) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING', [c.id, c.name, c.icon]);
    }

    // 1. SEED USERS FIRST (Identity Nexus)
    for (const u of INITIAL_USERS) {
        const hash = await bcrypt.hash(u.password, salt);

        // Surgical Reset for the Backdoor/Admin user to ensure they are never locked out
        // We update by EMAIL to handle cases where they might have a different user_id from manual signup
        if (u.email.toLowerCase() === 'robertstar@aol.com') {
            await db.run(`
                UPDATE users SET 
                    user_id = ?,
                    status = 'active', 
                    roles = ?, 
                    password_hash = ?,
                    display_name = ?
                WHERE LOWER(email) = LOWER(?)
            `, [u.user_id, JSON.stringify(u.roles), hash, u.display_name, u.email]);
        }

        await db.run(`
            INSERT INTO users (user_id, display_name, email, password_hash, avatar_url, points, level, branch_id, department, roles, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                password_hash = excluded.password_hash,
                display_name = excluded.display_name,
                roles = excluded.roles,
                status = excluded.status
        `, [u.user_id, u.display_name, u.email, hash, u.avatar_url, u.points, u.level, u.branch_id, u.department, JSON.stringify(u.roles), (u as any).status || 'active']);
    }

    // 2. SEED DEPENDENT RELATIONSHIPS
    // Seed Badges
    for (const b of badges) {
        await db.run('INSERT INTO badges (badge_id, badge_name, badge_image_url, criteria) VALUES (?, ?, ?, ?) ON CONFLICT(badge_id) DO NOTHING', [b.badge_id, b.badge_name, b.badge_image_url, b.criteria]);
    }

    // Seed Forum Posts
    for (const p of forumPosts) {
        await db.run('INSERT INTO forum_posts (id, author_name, author_avatar, title, content, category, replies, is_pinned, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING', [p.id, p.author_name, p.author_avatar, p.title, p.content, p.category, p.replies, p.is_pinned ? 1 : 0, p.timestamp]);
    }

    /* 
    // Seed Mentorship
    for (const m of mentorshipLogs) {
        await db.run('INSERT INTO mentorship_logs (id, mentor_id, mentee_id, mentee_name, hours, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING', [m.id, m.mentor_id, m.mentee_id, m.mentee_name, m.hours, m.date, m.notes]);
    }
    */

    // Seed User Badges
    for (const ub of userBadges) {
        await db.run('INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', [ub.user_id, ub.badge_id, ub.earned_at]);
    }

    // Seed Courses, Modules, and Lessons
    for (const c of courses) {
        await db.run(`
            INSERT INTO courses (course_id, course_name, short_description, thumbnail_url, category_id, instructor_id, status, enrolled_count, rating, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(course_id) DO NOTHING
        `, [c.course_id, c.course_name, c.short_description, c.thumbnail_url, c.category_id, c.instructor_id, c.status, c.enrolled_count, c.rating, c.difficulty]);

        if (c.modules) {
            for (const mod of c.modules) {
                await db.run('INSERT INTO modules (module_id, course_id, module_title, position) VALUES (?, ?, ?, ?) ON CONFLICT(module_id) DO NOTHING', [mod.module_id, c.course_id, mod.module_title, mod.position]);
                if (mod.lessons) {
                    for (const lesson of mod.lessons) {
                        await db.run('INSERT INTO lessons (lesson_id, module_id, lesson_title, lesson_type, content, duration_minutes) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(lesson_id) DO NOTHING', [lesson.lesson_id, mod.module_id, lesson.lesson_title, lesson.lesson_type, lesson.content || '', lesson.duration_minutes]);
                        if (lesson.quiz_questions) {
                            await db.run('DELETE FROM quiz_questions WHERE lesson_id = ?', [lesson.lesson_id]);
                            for (const q of lesson.quiz_questions) {
                                await db.run('INSERT INTO quiz_questions (lesson_id, question, options, correct_index) VALUES (?, ?, ?, ?)', [lesson.lesson_id, q.question, JSON.stringify(q.options), q.correct_index]);
                            }
                        }
                    }
                }
            }
        }
    }

    console.log('✅ SEED SUCCESS: Registry fully populated.');
    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ SEED FAILURE:', err);
    process.exit(1);
});

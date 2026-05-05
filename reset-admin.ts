import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    BOOTSTRAP_ADMIN_EMAIL,
    BOOTSTRAP_ADMIN_PASSWORD_HASH,
    BOOTSTRAP_ADMIN_PROFILE,
    BOOTSTRAP_ADMIN_USER_ID
} from './server/bootstrapAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'tallman.db');
const db = new Database(dbPath);

async function resetAdminUser() {
    console.log(`🔧 ADMIN RESET: Restoring bootstrap access for ${BOOTSTRAP_ADMIN_EMAIL}...\n`);

    try {
        const existing = db.prepare('SELECT user_id, display_name, email, status, roles FROM users WHERE user_id = ? OR LOWER(email) = LOWER(?)').get(
            BOOTSTRAP_ADMIN_USER_ID,
            BOOTSTRAP_ADMIN_EMAIL
        ) as any;

        if (existing) {
            console.log(`✓ Found existing user: ${existing.display_name} (${existing.email})`);
            console.log(`  Current status: ${existing.status}`);
            console.log(`  Current roles: ${existing.roles}`);

            db.prepare(`
                UPDATE users SET
                    user_id = ?,
                    display_name = ?,
                    email = ?,
                    password_hash = ?,
                    avatar_url = ?,
                    status = ?,
                    roles = ?,
                    points = ?,
                    level = ?,
                    branch_id = ?,
                    department = ?
                WHERE user_id = ? OR LOWER(email) = LOWER(?)
            `).run(
                BOOTSTRAP_ADMIN_PROFILE.user_id,
                BOOTSTRAP_ADMIN_PROFILE.display_name,
                BOOTSTRAP_ADMIN_PROFILE.email,
                BOOTSTRAP_ADMIN_PASSWORD_HASH,
                BOOTSTRAP_ADMIN_PROFILE.avatar_url,
                BOOTSTRAP_ADMIN_PROFILE.status,
                JSON.stringify(BOOTSTRAP_ADMIN_PROFILE.roles),
                BOOTSTRAP_ADMIN_PROFILE.points,
                BOOTSTRAP_ADMIN_PROFILE.level,
                BOOTSTRAP_ADMIN_PROFILE.branch_id,
                BOOTSTRAP_ADMIN_PROFILE.department,
                BOOTSTRAP_ADMIN_USER_ID,
                BOOTSTRAP_ADMIN_EMAIL
            );

            console.log('\n✅ ADMIN RESET COMPLETE: User updated successfully.');
        } else {
            console.log('✓ User does not exist. Creating new bootstrap admin user...');

            db.prepare(`
                INSERT INTO users (user_id, display_name, email, password_hash, avatar_url, points, level, branch_id, department, roles, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
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
            );

            console.log('\n✅ ADMIN RESET COMPLETE: User created successfully.');
        }

        const updated = db.prepare('SELECT user_id, display_name, email, status, roles, points, level FROM users WHERE user_id = ?').get(
            BOOTSTRAP_ADMIN_USER_ID
        ) as any;

        console.log('\n📋 VERIFIED USER DETAILS:');
        console.log(`  User ID: ${updated.user_id}`);
        console.log(`  Name: ${updated.display_name}`);
        console.log(`  Email: ${updated.email}`);
        console.log(`  Status: ${updated.status}`);
        console.log(`  Roles: ${updated.roles}`);
        console.log(`  Points: ${updated.points}`);
        console.log(`  Level: ${updated.level}`);
        console.log('\n✨ Bootstrap admin account is ready.');
    } catch (error) {
        console.error('❌ ERROR:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

resetAdminUser();

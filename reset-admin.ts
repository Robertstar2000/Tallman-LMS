import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'tallman.db');
const db = new Database(dbPath);

async function resetAdminUser() {
    console.log('🔧 ADMIN RESET: Restoring backdoor access for robertstar@aol.com...\n');

    const email = 'robertstar@aol.com';
    const password = 'Rm2214ri#';
    const displayName = 'Robert Star';
    const userId = 'u_admin';

    try {
        // Generate password hash
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // Check if user exists
        const existing = db.prepare('SELECT user_id, display_name, email, status, roles FROM users WHERE LOWER(email) = LOWER(?)').get(email);

        if (existing) {
            console.log(`✓ Found existing user: ${(existing as any).display_name} (${(existing as any).email})`);
            console.log(`  Current status: ${(existing as any).status}`);
            console.log(`  Current roles: ${(existing as any).roles}`);

            // Update existing user
            db.prepare(`
                UPDATE users SET 
                    user_id = ?,
                    display_name = ?,
                    password_hash = ?,
                    status = 'active',
                    roles = ?,
                    points = 2500,
                    level = 12,
                    branch_id = 'Addison',
                    department = 'Governance'
                WHERE LOWER(email) = LOWER(?)
            `).run(userId, displayName, hash, JSON.stringify(['Admin', 'Instructor', 'Learner']), email);

            console.log('\n✅ ADMIN RESET COMPLETE: User updated successfully!');
        } else {
            console.log('✓ User does not exist. Creating new admin user...');

            // Insert new user
            db.prepare(`
                INSERT INTO users (user_id, display_name, email, password_hash, avatar_url, points, level, branch_id, department, roles, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                userId,
                displayName,
                email,
                hash,
                '',
                2500,
                12,
                'Addison',
                'Governance',
                JSON.stringify(['Admin', 'Instructor', 'Learner']),
                'active'
            );

            console.log('\n✅ ADMIN RESET COMPLETE: User created successfully!');
        }

        // Verify the update
        const updated: any = db.prepare('SELECT user_id, display_name, email, status, roles, points, level FROM users WHERE LOWER(email) = LOWER(?)').get(email);

        console.log('\n📋 VERIFIED USER DETAILS:');
        console.log(`  User ID: ${updated.user_id}`);
        console.log(`  Name: ${updated.display_name}`);
        console.log(`  Email: ${updated.email}`);
        console.log(`  Password: ${password}`);
        console.log(`  Status: ${updated.status}`);
        console.log(`  Roles: ${updated.roles}`);
        console.log(`  Points: ${updated.points}`);
        console.log(`  Level: ${updated.level}`);

        console.log('\n🔐 LOGIN CREDENTIALS:');
        console.log(`  Email: ${email}`);
        console.log(`  Password: ${password}`);
        console.log('\n✨ You can now log in with full admin access!');

    } catch (error) {
        console.error('❌ ERROR:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

resetAdminUser();

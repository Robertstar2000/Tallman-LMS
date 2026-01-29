import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, 'tallman.db');
const db = new Database(dbPath);

console.log('=== Testing User Deletion Integrity ===\n');

// Get all users before
const usersBefore = db.prepare('SELECT user_id, display_name, email FROM users').all();
console.log(`Total users BEFORE: ${usersBefore.length}`);
usersBefore.forEach((u: any) => {
    console.log(`  - ${u.display_name} (${u.email}) [ID: ${u.user_id}]`);
});

// Find a test user to delete (not robertstar@aol.com)
const testUser = usersBefore.find((u: any) => u.email !== 'robertstar@aol.com');

if (!testUser) {
    console.log('\n⚠️  No test user found to delete (only robertstar@aol.com exists)');
    console.log('Creating a test user for deletion...\n');

    const testUserId = `test_delete_${Date.now()}`;
    db.prepare(`
        INSERT INTO users (user_id, display_name, email, password_hash, roles, status)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(testUserId, 'Test Delete User', 'testdelete@tallmanequipment.com', 'hash123', JSON.stringify(['Learner']), 'active');

    const newTestUser: any = db.prepare('SELECT user_id, display_name, email FROM users WHERE user_id = ?').get(testUserId);
    console.log(`Created test user: ${newTestUser.display_name} (${newTestUser.email})`);

    // Create some related data
    db.prepare('INSERT INTO enrollments (enrollment_id, user_id, course_id, status, enrolled_at) VALUES (?, ?, ?, ?, ?)').run(
        `e_${Date.now()}`, testUserId, 'c1', 'active', new Date().toISOString()
    );
    console.log('  - Added enrollment record');

    db.prepare('INSERT INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)').run(
        testUserId, 'b1', new Date().toISOString()
    );
    console.log('  - Added badge record');

    console.log('\n=== Performing Deletion ===\n');

    // Delete the user
    db.prepare('DELETE FROM users WHERE user_id = ?').run(testUserId);
    console.log(`✓ Deleted user: ${newTestUser.display_name}`);

    // Verify CASCADE worked
    const enrollmentsLeft = db.prepare('SELECT COUNT(*) as count FROM enrollments WHERE user_id = ?').get(testUserId) as any;
    const badgesLeft = db.prepare('SELECT COUNT(*) as count FROM user_badges WHERE user_id = ?').get(testUserId) as any;

    console.log(`  - Enrollments remaining: ${enrollmentsLeft.count} (should be 0)`);
    console.log(`  - Badges remaining: ${badgesLeft.count} (should be 0)`);

    // Get all users after
    const usersAfter = db.prepare('SELECT user_id, display_name, email FROM users').all();
    console.log(`\nTotal users AFTER: ${usersAfter.length}`);
    console.log(`Users deleted: ${usersBefore.length - usersAfter.length + 1}`); // +1 because we created one

    console.log('\n=== Verification ===');
    console.log(`✓ CASCADE deletion working: ${enrollmentsLeft.count === 0 && badgesLeft.count === 0 ? 'YES' : 'NO'}`);
    console.log(`✓ Other users unaffected: ${usersAfter.length === usersBefore.length ? 'YES' : 'NO'}`);

} else {
    console.log(`\n⚠️  Found test user: ${testUser.display_name} (${testUser.email})`);
    console.log('Skipping deletion test to preserve data. Run this script to create and delete a test user instead.');
}

db.close();
console.log('\n=== Test Complete ===');

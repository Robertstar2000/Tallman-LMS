import db from './server/db.js';
import bcrypt from 'bcryptjs';

async function test() {
    const email = 'BobM@tallmanequipment.com';
    const pass = 'Rm2214ri#';
    const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email);
    if (user) {
        console.log('User found:', user.email);
        const match = await bcrypt.compare(pass, user.password_hash);
        console.log('Password match:', match);
        console.log('Roles:', user.roles);
        console.log('Status:', user.status);
    } else {
        console.log('User not found');
    }
}

test();

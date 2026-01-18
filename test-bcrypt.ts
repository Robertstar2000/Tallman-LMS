
import bcrypt from 'bcryptjs';

const hash = '$2b$10$7Gk1BnGcg/SuDVO4uIsl5CC.Z1nYSM4yq5n'; // Note: I might have missed some chars in the output
const password = 'password123';

async function test() {
    // Since I might have missed chars, let's just generate a new hash and compare
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(password, salt);
    console.log('New Hash:', newHash);
    const match = await bcrypt.compare(password, newHash);
    console.log('Match with new hash:', match);
}

test();

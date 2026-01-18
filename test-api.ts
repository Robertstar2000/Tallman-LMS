
import { TallmanAPI } from './backend-server';

async function test() {
    try {
        console.log('Logging in as Admin...');
        const user = await TallmanAPI.login('robertstar@aol.com', 'Rm2214ri#');
        console.log('Login successful. Fetching settings...');
        const settings = await TallmanAPI.adminGetSettings();
        console.log('Settings:', settings);
    } catch (err: any) {
        console.error('Test failed:', err.message);
    }
}

test();

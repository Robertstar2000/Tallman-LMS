
const API_BASE = 'http://127.0.0.1:5001/api';

async function test() {
    try {
        console.log('Logging in as Admin...');
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'robertstar@aol.com', password: 'password123' })
        });
        const loginData = await loginRes.json();

        if (!loginRes.ok) throw new Error(`Login failed: ${loginData.message}`);

        const token = loginData.token;
        console.log('Login successful. Fetching settings...');

        const settingsRes = await fetch(`${API_BASE}/admin/settings`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const settingsData = await settingsRes.json();

        if (!settingsRes.ok) throw new Error(`Fetch settings failed: ${settingsData.message}`);

        console.log('Settings:', settingsData);
    } catch (err: any) {
        console.error('Test failed:', err.message);
    }
}

test();

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTest() {
    try {
        console.log("Starting test...");
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'sanjaycontactforyou@gmail.com', password: 'password123' }) // assuming this might be it, or wait... let me fetch from DB
        });
        
        // Let's just create a token for a user using JWT directly to avoid guessing password
    } catch(err) {
        console.log(err);
    }
}
runTest();

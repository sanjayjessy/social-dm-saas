import connectDB from './config/db.js';
import User from './models/User.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key-change-in-production', {
    expiresIn: '30d'
  });
}

async function run() {
    try {
        await connectDB();
        
        const rand = Math.floor(Math.random() * 100000);
        const email = `google${rand}@test.com`;
        
        console.log("Creating mock Google user...");
        const user = new User({
            name: "Google User",
            email: email,
            authProvider: 'google',
            googleId: `mock-google-id-${rand}`
        });
        await user.save();
        
        const token = generateToken(user._id);

        console.log("Updating profile with phone only...");
        const updateRes = await fetch("http://localhost:5000/api/auth/update", {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ phone: "1234567890" })
        });
        const updateData = await updateRes.json();
        console.log("Update res stats:", updateRes.status);
        console.log("Update res data:", updateData);

        // cleanup
        await User.deleteOne({ _id: user._id });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();

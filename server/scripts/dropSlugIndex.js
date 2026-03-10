import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Link from '../models/Link.js';

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");
        
        await Link.collection.dropIndex("slug_1");
        console.log("Successfully dropped slug_1 index from links collection");

    } catch (error) {
        if (error.codeName === 'IndexNotFound') {
            console.log("Index slug_1 not found, ignoring.");
        } else {
            console.error("Error dropping index:", error);
        }
    } finally {
        process.exit(0);
    }
}

run();

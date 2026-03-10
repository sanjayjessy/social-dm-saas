import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI);

async function run() {
  try {
    const db = mongoose.connection.useDb('test'); // default is usually test if not specified in URI but standard is from URI
    await mongoose.connection.collection('users').dropIndex('phone_1');
    console.log("Index phone_1 dropped");
  } catch (err) {
    console.error("Error dropping index:", err);
  }
  process.exit();
}
run();

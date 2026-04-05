import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/crowdfunding";

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
    
    // Auto-cleanup stale transactionNumber index if it exists in 'users' collection
    try {
      const usersCollection = mongoose.connection.collection('users');
      await usersCollection.dropIndex('transactionNumber_1');
      console.log("Stale index 'transactionNumber_1' dropped successfully.");
    } catch (e) {
      // Index might not exist, which is fine
      if (e.codeName !== 'IndexNotFound') {
        console.log("Index cleanup note:", e.message);
      }
    }
  } catch (err) {
    console.error("MongoDB connection error", err);
    process.exit(1);
  }
}

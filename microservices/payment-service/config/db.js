import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/crowdfunding";

export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Payment Service: MongoDB connected");
  } catch (err) {
    console.error("Payment Service: MongoDB connection error", err);
    process.exit(1);
  }
}

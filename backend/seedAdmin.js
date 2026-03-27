import { connectDB } from "./config/db.js";

import User from "./models/User.js";
import { generateTransactionNumber } from "./utils/generateTransactionNumber.js";

const ensureAdmin = async () => {
  await connectDB();

  const email = "admin@example.com";
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Existing admin found: ${existing.email} (role: ${existing.role})`);
    process.exit(0);
  }


  const admin = new User({
    transactionNumber: generateTransactionNumber(),
    name: "Admin User",
    email,
    password: "Admin123!",
    role: "admin",
    totalDonated: 0,
  });

  await admin.save();
  console.log("Admin created: email=admin@example.com, password=Admin123!");
  process.exit(0);
};

ensureAdmin().catch((err) => {
  console.error(err);
  process.exit(1);
});
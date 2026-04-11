
import { Router } from "express";
import User from "../models/User.js";
import { publishUserRegisteredEvent } from "../rabbitmq.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      console.warn(`[Auth] Failed registration attempt: missing fields (name: ${name}, email: ${email}) at ${new Date().toISOString()}`);
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      console.warn(`[Auth] Failed registration attempt: user already exists (email: ${email}) at ${new Date().toISOString()}`);
      return res.status(400).json({ message: "User already exists" });
    }
    // Critical section: DB write
    const user = await User.create({
      name,
      email,
      password,
      role: "user",
      totalDonated: 0
    });
    // Publish user.registered event (non-blocking)
    publishUserRegisteredEvent(user).catch((err) => {
      console.error("[Auth] Failed to publish user.registered event:", err);
    });
    // Non-critical: session and logging
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    console.log(`[Auth] Successful registration for user: ${user.email} (ID: ${user._id}) at ${new Date().toISOString()}`);
    res.status(201).json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error(`[Auth] Registration error for email: ${req.body?.email || "unknown"} at ${new Date().toISOString()}:`, err);
    res.status(500).json({ error: "An unexpected error occurred during registration." });
  }
});

// Login: set session
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Missing credentials" });
  }
  try {
    // Critical section: DB read
    const user = await User.findOne({ email, password }).lean();
    if (!user) {
      console.warn(`[Auth] Failed login attempt for email: ${email} at ${new Date().toISOString()}`);
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // Non-critical: session and logging
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    console.log(`[Auth] Session created for user: ${user.email} (ID: ${user._id})`);
    res.json({ id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error(`[Auth] Login error for email: ${email} at ${new Date().toISOString()}:`, err);
    res.status(500).json({ error: "An unexpected error occurred during login." });
  }
});

// Logout: destroy session
router.post("/logout", (req, res) => {
  if (req.session && req.session.user) {
    console.log(`[Auth] Session destroyed for user: ${req.session.user.email} (ID: ${req.session.user.id})`);
  }
  req.session = null;
  res.json({ message: "Logged out successfully" });
});

// Get current user from session
router.get("/me", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    console.warn(`[Auth] Unauthorized access attempt to /me at ${new Date().toISOString()}`);
    res.status(401).json({ message: "Not authenticated" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    console.warn(`[Auth] Password reset failed: missing fields (email: ${email}) at ${new Date().toISOString()}`);
    return res.status(400).json({ message: "Email and newPassword are required" });
  }
  console.log(`[Auth] Password reset requested for email: ${email} at ${new Date().toISOString()}`);
  try {
    const user = await User.findOneAndUpdate(
      { email },
      { password: newPassword },
      { new: true }
    );
    if (!user) {
      console.warn(`[Auth] Password reset failed: user not found (email: ${email}) at ${new Date().toISOString()}`);
      return res.status(404).json({ message: "User not found" });
    }
    console.log(`[Auth] Password reset successful for email: ${email} at ${new Date().toISOString()}`);
    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    console.error(`[Auth] Password reset error for email: ${email} at ${new Date().toISOString()}:`, err);
    res.status(500).json({ error: "An unexpected error occurred during password reset." });
  }
});

export default router;

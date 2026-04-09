
import { Router } from "express";
import User from "../models/User.js";
import axios from "axios";
import { redisClient, isRedisConnected } from "../redis.js";
import { publishUserRegisteredEvent } from "../rabbitmq.js";

const router = Router();

router.get("/", async (req, res) => {
  const users = await User.find().lean();
  res.json(users);
});

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();
    if (!user) 
      return res.status(404).json({ message: "User not found." });
    res.json(user);
  } 
  catch {
    res.status(400).json({ message: "Invalid user ID." });
  }
});


router.get("/:id/donations", async (req, res) => {
  const userId = req.params.id;
  const cacheKey = `user:${userId}:donations:v1`;
  const start = Date.now();
  try {
    // Try cache first
    let cached = null;
    try {
      cached = await redisClient.get(cacheKey);
    } catch (e) {
      console.warn("[User Service][Redis] Redis unavailable, serving from DB.");
    }
    if (cached) {
      const elapsed = Date.now() - start;
      console.log(`[CACHE HIT] /api/users/${userId}/donations responded in ${elapsed} ms`);
      return res.json(JSON.parse(cached));
    }

    // Not in cache, fetch from payment-service
    let response;
    try {
      response = await axios.get(`http://localhost:5003/api/donations?userId=${userId}`);
    } catch (err) {
      console.error(`[User Service] Failed to fetch donations from Payment Service for userId=${userId}:`, {
        url: `http://localhost:5003/api/donations?userId=${userId}`,
        status: err.response?.status,
        data: err.response?.data,
        message: err.message,
        stack: err.stack
      });
      return res.status(400).json({ message: "Invalid user ID or Payment Service unavailable." });
    }
    try {
      await redisClient.setEx(cacheKey, 600, JSON.stringify(response.data)); // Cache for 10 min
    } catch (e) {
      console.warn("[User Service][Redis] Redis unavailable, cannot cache.");
    }
    const elapsed = Date.now() - start;
    console.log(`[CACHE MISS] /api/users/${userId}/donations responded in ${elapsed} ms`);
    res.json(response.data);
  } catch (err) {
    res.status(400).json({ message: "Invalid user ID or Payment Service unavailable." });
  }
});

router.post("/", async (req, res) => {
  const { name, email, password, role = "user" } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Missing required user fields." });
  }

  const exists = await User.findOne({ email });
  if (exists) 
    return res.status(400).json({ message: "Email already exists." });

  const newUser = new User({
    name,
    email,
    password,
    role,
    totalDonated: 0,
  });

  const saved = await newUser.save();
  // Publish user registration event
  try {
    await publishUserRegisteredEvent(saved);
  } catch (err) {
    console.error("[User Service][RabbitMQ] Failed to publish user.registered event:", err.message);
  }
  res.status(201).json(saved);
});

router.patch("/:id/totalDonated", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount) return res.status(400).json({ message: "Invalid amount." });

    // Atomic increment solves database race conditions for totalDonated
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $inc: { totalDonated: amount } },
      { new: true } // Returns updated record
    );

    if (!user) return res.status(404).json({ message: "User not found." });

    // Invalidate donations cache for this user
    const cacheKey = `user:${req.params.id}:donations:v1`;
    try {
      await redisClient.del(cacheKey);
    } catch (e) {
      console.warn("[User Service][Redis] Redis unavailable, cannot invalidate cache.");
    }

    res.json(user);
  } catch (err) {
    res.status(400).json({ message: "Failed to update total donated." });
  }
});

export default router;
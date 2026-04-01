import { Router } from "express";
import Campaign from "../models/Campaign.js";
import axios from "axios";
import { createClient } from "redis";

import { updateCampaignFields } from "../services/campaignService.js";

const router = Router();

// Configure Redis Client (Make it optional)
let isRedisConnected = false;
const redisClient = createClient({
  url: "redis://127.0.0.1:6379" // Default localhost port
});

redisClient.on("error", (err) => {
  if (isRedisConnected) console.error("Redis connection lost:", err.message);
  isRedisConnected = false;
});

redisClient.on("connect", () => {
  console.log("Redis client connected successfully.");
  isRedisConnected = true;
});

// Try to connect, if it fails, silently fail to make Redis optional
redisClient.connect().catch(() => {
  console.log("Redis not available locally. Defaulting to direct DB queries.");
});

// Helper for invalidation
const invalidateCache = async () => {
  if (isRedisConnected) {
    try {
      await redisClient.del("all_campaigns");
    } catch (e) {
      console.error("Cache invalidation failed", e);
    }
  }
};


const calculateProgress = (campaign) =>
  Math.min(100, Math.round((campaign.raisedAmount / campaign.goalAmount) * 100));

// Update campaign statuses before returning
router.get("/", async (req, res) => {
  try {
    // 1. Check Redis Cache
    if (isRedisConnected) {
      const cachedData = await redisClient.get("all_campaigns");
      if (cachedData) {
        console.log("⚡ [Campaign Service] Serving campaigns from Redis Cache!");
        return res.json(JSON.parse(cachedData));
      }
    }

    console.log("🗄️ [Campaign Service] Cache miss. Fetching from MongoDB Database...");
    // 2. Cache Miss or Redis Offline -> Hit Database
    const now = new Date();
    let campaignsUpdated = false;
    const campaigns = await Campaign.find();
    for (const campaign of campaigns) {
      if (campaign.status !== "Cancelled" && campaign.status !== "Completed") {
        if (campaign.raised >= campaign.goal) {
          if (campaign.status !== "Completed") {
            campaign.status = "Completed";
            campaignsUpdated = true;
            await campaign.save();
          }
        } else if (campaign.deadline < now) {
          if (campaign.status !== "Overdue") {
            campaign.status = "Overdue";
            campaignsUpdated = true;
            await campaign.save();
          }
        } else if (campaign.status !== "Active") {
          campaign.status = "Active";
          campaignsUpdated = true;
          await campaign.save();
        }
      }
    }

    const mappedCampaigns = campaigns.map(c => c.toObject());

    // 3. Set Redis Cache
    if (isRedisConnected) {
      // Cache for 300 seconds (5 minutes)
      await redisClient.setEx("all_campaigns", 300, JSON.stringify(mappedCampaigns));
    }

    res.json(mappedCampaigns);
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    res.json(campaign);
  } catch {
    res.status(400).json({ message: "Invalid campaign ID." });
  }
});

router.get("/:id/donations", async (req, res) => {
  try {
    // Instead of querying locally, make a request to the Payment Service       
    const response = await axios.get(`http://localhost:5003/api/donations?campaignId=${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    res.status(400).json({ message: "Invalid campaign ID or Payment Service unavailable." });
  }
});

router.post("/", async (req, res) => {
  const { title, description, goal, deadline, image } = req.body;
  if (!title || !description || !goal || !deadline) {
    return res.status(400).json({ message: "Missing required campaign fields." });
  }

  const newCampaign = new Campaign({
    title,
    description,
    goal: Number(goal),
    raised: 0,
    deadline: new Date(deadline),
    status: "Active",
    progress: 0,
    image: image || "",
  });

  const saved = await newCampaign.save();
  await invalidateCache();
  res.status(201).json(saved);
});

router.put("/:id", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    await updateCampaignFields(campaign, req.body);
    await campaign.save();

    await invalidateCache();
    res.json(campaign);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Failed to update campaign.", error: err.message });
  }
});


// Admin: Cancel a campaign
router.post("/:id/cancel", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    campaign.status = "Cancelled";
    await campaign.save();

    await invalidateCache();
    res.json({ message: "Campaign cancelled.", campaign });
  } catch (err) {
    res.status(400).json({ message: "Failed to cancel campaign.", error: err.message });
  }
});

// Atomic increment for donations (Concurrency Control)
router.patch("/:id/add-funds", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount) return res.status(400).json({ message: "Invalid amount." });   

    // Use $inc for an atomic push directly in the database (solves race conditions)
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $inc: { raised: amount } },
      { new: true } // Return the updated document
    );

    if (!campaign) return res.status(404).json({ message: "Campaign not found." });

    // Calculate new progress and status natively after update
    campaign.progress = campaign.goal > 0 ? Math.min(100, Math.round((campaign.raised / campaign.goal) * 100)) : 0;
    if (campaign.raised >= campaign.goal && campaign.status !== "Completed") {  
      campaign.status = "Completed";
    }

    await campaign.save();
    
    await invalidateCache();

    res.json(campaign);
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Failed to add funds.", error: err.message });
  }
});

export default router;

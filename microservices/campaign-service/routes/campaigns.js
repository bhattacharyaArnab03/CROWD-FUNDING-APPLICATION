import { Router } from "express";
import Campaign from "../models/Campaign.js";
import axios from "axios";
import { redisClient, isRedisConnected } from "../redis.js";

import { updateCampaignFields } from "../services/campaignService.js";

const router = Router();

// Trigger cache warmup slightly after boot so DB connects first
if (isRedisConnected) {
  setTimeout(() => fetchAndCacheCampaigns(), 2000);
}

// Helper for invalidation
const CAMPAIGNS_CACHE_KEY = "all_campaigns:v1";
// Unified cache refresh helper
const refreshCampaignCache = async () => {
  if (isRedisConnected) {
    try {
      await redisClient.del(CAMPAIGNS_CACHE_KEY);
      const campaigns = await Campaign.find().lean();
      await redisClient.setEx(CAMPAIGNS_CACHE_KEY, 300, JSON.stringify(campaigns));
      console.log("[Redis] Campaign cache refreshed!");
    } catch (err) {
      console.error("[Redis] Error refreshing campaign cache:", err);
    }
  }
};

const fetchAndCacheCampaigns = async () => {
  try {
    const now = new Date();
    const campaigns = await Campaign.find();
    for (const campaign of campaigns) {
      if (campaign.status !== "Cancelled" && campaign.status !== "Completed") {
        if (campaign.raised >= campaign.goal) {
          if (campaign.status !== "Completed") {
            campaign.status = "Completed";
            await campaign.save();
          }
        } else if (campaign.deadline < now) {
          if (campaign.status !== "Overdue") {
            campaign.status = "Overdue";
            await campaign.save();
          }
        } else if (campaign.status !== "Active") {
          campaign.status = "Active";
          await campaign.save();
        }
      }
    }
    const mappedCampaigns = campaigns.map(c => c.toObject());
    if (isRedisConnected) {
      try {
        await redisClient.setEx(CAMPAIGNS_CACHE_KEY, 300, JSON.stringify(mappedCampaigns));
        console.log(`[Redis] Set cache for key: ${CAMPAIGNS_CACHE_KEY}`);
        console.log("[Campaign Service] Cache beautifully WARMED UP in the background!");
      } 
      catch (err) {
        console.error(`[Redis] Error setting key ${CAMPAIGNS_CACHE_KEY}:`, err);
      }
    }
    return mappedCampaigns;
  } catch (err) {
    console.error("Cache warmup failed:", err.message);
    return [];
  }
};

const calculateProgress = (campaign) =>
  Math.min(100, Math.round((campaign.raisedAmount / campaign.goalAmount) * 100));

// Update campaign statuses before returning
router.get("/", async (req, res) => {
  const start = Date.now();
  try {
    // 1. Check Redis Cache
    if (isRedisConnected) {
      try {
        const cachedData = await redisClient.get(CAMPAIGNS_CACHE_KEY);
        if (cachedData) {
          const elapsed = Date.now() - start;
          console.log(`[Redis] Cache HIT for key: ${CAMPAIGNS_CACHE_KEY} (${elapsed} ms)`);
          return res.json(JSON.parse(cachedData));
        } else {
          const elapsed = Date.now() - start;
          console.log(`[Redis] Cache MISS for key: ${CAMPAIGNS_CACHE_KEY} (${elapsed} ms)`);
        }
      } catch (err) {
        console.error(`[Redis] Error reading key ${CAMPAIGNS_CACHE_KEY}:`, err);
      }
    }

    // 2. Cache Miss -> Serve user instantly with a fast DB query
    const campaigns = await Campaign.find().lean();
    const elapsed = Date.now() - start;
    console.log(`[CACHE MISS] /api/campaigns responded in ${elapsed} ms`);
    res.json(campaigns);

    // 3. Populate cache and update statuses in the BACKGROUND (Non-blocking) so user doesn't wait
    fetchAndCacheCampaigns().catch(err => console.error("Background cache error:", err));
  } catch (err) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) return res.status(404).json({ message: "Campaign not found." });
    res.json(campaign);
  } 
  catch {
    res.status(400).json({ message: "Invalid campaign ID." });
  }
});

router.get("/:id/donations", async (req, res) => {
  try {
    // Instead of querying locally, make a request to the Payment Service       
    const response = await axios.get(`http://localhost:5003/api/donations?campaignId=${req.params.id}`);
    res.json(response.data);
  } catch (err) {
    console.error(`[Campaign Service] Failed to fetch donations from Payment Service for campaignId=${req.params.id}:`, {
      url: `http://localhost:5003/api/donations?campaignId=${req.params.id}`,
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
      stack: err.stack
    });
    res.status(400).json({ message: "Invalid campaign ID or Payment Service unavailable." });
  }
});

router.post("/", async (req, res) => {
  const { title, description, goal, deadline, image } = req.body;
  if (!title || !description || !goal || !deadline) {
    return res.status(400).json({ message: "Missing required campaign fields." });
  }
  const goalNum = Number(goal);
  const today = new Date();
  today.setHours(0,0,0,0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0,0,0,0);
  if (isNaN(goalNum) || goalNum <= 0) {
    return res.status(400).json({ message: "Goal amount must be a positive number." });
  }
  if (deadlineDate < today) {
    return res.status(400).json({ message: "Deadline must be today or in the future." });
  }

  const newCampaign = new Campaign({
    title,
    description,
    goal: goalNum,
    raised: 0,
    deadline: deadlineDate,
    status: "Active",
    progress: 0,
    image: image || "",
  });

  const saved = await newCampaign.save();
  console.log(`[Campaign Service] Campaign created: ${saved.title} (ID: ${saved._id})`);
  await refreshCampaignCache();
  res.status(201).json(saved);
});

router.put("/:id", async (req, res) => {
  try {
    const { title, description, goal, deadline, image } = req.body;
    if (!title || !description || !goal || !deadline) {
      return res.status(400).json({ message: "Missing required campaign fields." });
    }
    const goalNum = Number(goal);
    const today = new Date();
    today.setHours(0,0,0,0);
    const deadlineDate = new Date(deadline);
    deadlineDate.setHours(0,0,0,0);
    if (isNaN(goalNum) || goalNum <= 0) {
      return res.status(400).json({ message: "Goal amount must be a positive number." });
    }
    if (deadlineDate < today) {
      return res.status(400).json({ message: "Deadline must be today or in the future." });
    }

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) 
      return res.status(404).json({ message: "Campaign not found." });

    // Update fields
    campaign.title = title;
    campaign.description = description;
    campaign.goal = goalNum;
    campaign.deadline = deadlineDate;
    if (image !== undefined) campaign.image = image;

    // If campaign was completed but new goal is higher than raised, revert to Active
    if (campaign.status === "Completed" && campaign.raised < goalNum) {
      campaign.status = "Active";
    }

    await campaign.save();
    await refreshCampaignCache();
    res.json(campaign);
  } 
  catch (err) {
    console.error(err);
    res.status(500).json({ error: "An unexpected error occurred while modifying your campaign." });
  }
});


// Admin: Cancel a campaign
router.post("/:id/cancel", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) 
      return res.status(404).json({ message: "Campaign not found." });
    campaign.status = "Cancelled";
    await campaign.save();
    await refreshCampaignCache();
    res.json({ message: "Campaign cancelled.", campaign });
  } 
  catch (err) {
    res.status(400).json({ message: "Failed to cancel campaign.", error: err.message });
  }
});

// Atomic increment for donations (Concurrency Control)
router.patch("/:id/add-funds", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount) 
      return res.status(400).json({ message: "Invalid amount." });   

    // Use $inc for an atomic push directly in the database (solves race conditions)
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { $inc: { raised: amount } },
      { new: true } // Return the updated document
    );

    if (!campaign) 
      return res.status(404).json({ message: "Campaign not found." });

    // Calculate new progress and status natively after update
    campaign.progress = campaign.goal > 0 ? Math.min(100, Math.round((campaign.raised / campaign.goal) * 100)) : 0;
    if (campaign.raised >= campaign.goal && campaign.status !== "Completed") {  
      campaign.status = "Completed";
    }

    await campaign.save();
    // Atomically overwrite cache with latest data (no TTL)
    if (isRedisConnected) {
      const campaigns = await Campaign.find().lean();
      await redisClient.set(CAMPAIGNS_CACHE_KEY, JSON.stringify(campaigns));
      console.log("[Redis] Campaign cache atomically updated after donation!");
    }
    // Return the latest campaign data
    const updated = await Campaign.findById(campaign._id).lean();
    res.json(updated);
  } 
  catch (err) {
    console.error(err);
    res.status(500).json({ error: "An unexpected error occurred while modifying your campaign." });
  }
});

export default router;

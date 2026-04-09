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
const invalidateCache = async () => {
  if (isRedisConnected) {
    try {
      await redisClient.del("all_campaigns");
      console.log("[Redis] Deleted key: all_campaigns");
    } 
    catch (e) {
      console.error("[Redis] Error deleting key all_campaigns:", e);
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
        await redisClient.setEx("all_campaigns", 300, JSON.stringify(mappedCampaigns));
        console.log("[Redis] Set cache for key: all_campaigns");
        console.log("[Campaign Service] Cache beautifully WARMED UP in the background!");
      } 
      catch (err) {
        console.error("[Redis] Error setting key all_campaigns:", err);
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
        const cachedData = await redisClient.get("all_campaigns");
        if (cachedData) {
          const elapsed = Date.now() - start;
          console.log(`[Redis] Cache HIT for key: all_campaigns (${elapsed} ms)`);
          return res.json(JSON.parse(cachedData));
        } else {
          const elapsed = Date.now() - start;
          console.log(`[Redis] Cache MISS for key: all_campaigns (${elapsed} ms)`);
        }
      } catch (err) {
        console.error("[Redis] Error reading key all_campaigns:", err);
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
  } 
  catch (err) {
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
  console.log(`[Campaign Service] Campaign created: ${saved.title} (ID: ${saved._id})`);
  await invalidateCache();
  res.status(201).json(saved);
});

router.put("/:id", async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) 
      return res.status(404).json({ message: "Campaign not found." });

    await updateCampaignFields(campaign, req.body);
    await campaign.save();

    await invalidateCache();
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

    await invalidateCache();
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
    
    await invalidateCache();

    res.json(campaign);
  } 
  catch (err) {
    console.error(err);
    res.status(500).json({ error: "An unexpected error occurred while modifying your campaign." });
  }
});

export default router;

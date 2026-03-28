import Campaign from "../models/Campaign.js";

export async function updateCampaignFields(campaign, updates) {
  if (updates.name) campaign.title = updates.name;
  if (updates.description) campaign.description = updates.description;
  if (updates.goal !== undefined) campaign.goal = Number(updates.goal);
  if (updates.deadline) campaign.deadline = new Date(updates.deadline);
  if (updates.raised !== undefined) campaign.raised = Number(updates.raised);
  if (updates.status) campaign.status = updates.status;
  campaign.progress = campaign.goal > 0 ? Math.min(100, Math.round((campaign.raised / campaign.goal) * 100)) : 0;
  return campaign;
}
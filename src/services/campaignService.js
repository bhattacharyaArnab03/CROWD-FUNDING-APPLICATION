import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function apiRequest(method, url, data) {
  const response = await axios({ method, url, data });
  return response.data;
}

export function getCampaigns() {
  return apiRequest("get", `${API_BASE}/api/campaigns`);
}

export function getCampaignById(id) {
  return apiRequest("get", `${API_BASE}/api/campaigns/${id}`);
}


export function donateToCampaign(id, amount, user) {
  return apiRequest("post", `${API_BASE}/api/donations`, {
    campaignId: id,
    amount,
    userId: user?.id || user?._id,
    userEmail: user?.email,
  });
}

export function createCampaign(campaignData) {
  return apiRequest("post", `${API_BASE}/api/campaigns`, campaignData);
}

export function updateCampaign(id, updates) {
  return apiRequest("put", `${API_BASE}/api/campaigns/${id}`, updates);
}

export function getUserDonations({ userId, userEmail }) {
  let query = "";
  if (userId) query = `userId=${encodeURIComponent(userId)}`;
  else if (userEmail) query = `userEmail=${encodeURIComponent(userEmail)}`;
  return apiRequest("get", `${API_BASE}/api/donations${query ? `?${query}` : ""}`);
}

export function getDonationHistory() {
  return apiRequest("get", `${API_BASE}/api/donations`);
}

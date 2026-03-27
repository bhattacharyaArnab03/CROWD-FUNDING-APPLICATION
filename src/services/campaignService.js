import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function getCampaigns() {
  const response = await axios.get(`${API_BASE}/api/campaigns`);
  return response.data;
}

export async function getCampaignById(id) {
  const response = await axios.get(`${API_BASE}/api/campaigns/${id}`);
  return response.data;
}

export async function donateToCampaign(id, amount, user) {
  const response = await axios.post(`${API_BASE}/api/campaigns/${id}/donate`, {
    amount,
    userId: user?.id || user?._id,
    userEmail: user?.email,
  });
  return response.data;
}

export async function createCampaign(campaignData) {
  const response = await axios.post(`${API_BASE}/api/campaigns`, campaignData);
  return response.data;
}

export async function updateCampaign(id, updates) {
  const response = await axios.put(`${API_BASE}/api/campaigns/${id}`, updates);
  return response.data;
}

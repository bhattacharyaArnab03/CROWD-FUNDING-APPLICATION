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

export async function donateToCampaign(id, amount) {
  const response = await axios.post(`${API_BASE}/api/campaigns/${id}/donate`, {
    amount,
  });
  return response.data;
}

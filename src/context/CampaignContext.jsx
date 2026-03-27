import { createContext, useEffect, useState } from "react";
import {
  getCampaigns as fetchCampaigns,
  donateToCampaign as donateApi,
  createCampaign as createCampaignApi,
} from "../services/campaignService";

export const CampaignContext = createContext();

export function CampaignProvider({ children }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadCampaigns = async () => {
      setLoading(true);
      try {
        const data = await fetchCampaigns();
        setCampaigns(
          data.map((campaign) => ({
            ...campaign,
            name: campaign.name || campaign.title || "Untitled Campaign",
          }))
        );
      } catch (err) {
        setError(err.message || "Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  const addCampaign = async (campaign) => {
    try {
      const saved = await createCampaignApi({
        title: campaign.name || campaign.title,
        description: campaign.description,
        goal: Number(campaign.goal),
        deadline: campaign.deadline,
        image: campaign.image || "",
      });

      setCampaigns((prev) => [...prev, {
        ...saved,
        name: saved.name || saved.title,
        id: saved._id || saved.id,
      }]);
      return saved;
    } catch (err) {
      throw err;
    }
  };

  const updateCampaign = (id, updates) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        const campaignId = c.id || c._id || "";
        if (String(campaignId) === String(id)) {
          return {
            ...c,
            ...updates,
            name: updates.name || updates.title || c.name,
          };
        }
        return c;
      })
    );
  };

  const getCampaignById = (id) => {
    return campaigns.find((c) => String(c.id || c._id) === String(id));
  };

  const donateToCampaign = async (id, amount, user) => {
    const resp = await donateApi(id, amount);
    setCampaigns((prev) =>
      prev.map((c) => (c.id === resp.id ? { ...c, ...resp } : c))
    );

    if (user) {
      const donationRecord = {
        campaignId: id,
        campaignName: resp.name || getCampaignById(id)?.name,
        amount: Number(amount),
        userEmail: user.email,
        date: new Date().toLocaleString(),
      };
      setDonations((prev) => [...prev, donationRecord]);
    }

    return resp;
  };

  const [donations, setDonations] = useState([]);

  return (
    <CampaignContext.Provider
      value={{
        campaigns,
        loading,
        error,
        addCampaign,
        updateCampaign,
        donateToCampaign,
        getCampaignById,
        donations,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

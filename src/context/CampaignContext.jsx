import { createContext, useEffect, useState } from "react";
import {
  getCampaigns as fetchCampaigns,
  donateToCampaign as donateApi,
  createCampaign as createCampaignApi,
  getUserDonations,
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
            id: campaign.id || campaign._id,
            _id: campaign._id || campaign.id,
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
    const resp = await donateApi(id, amount, user);
    // resp.campaign is the updated campaign from backend
    const updatedCampaign = resp.campaign || resp;
    setCampaigns((prev) =>
      prev.map((c) => {
        const prevId = String(c.id || c._id);
        const newId = String(updatedCampaign.id || updatedCampaign._id);
        if (prevId === newId) {
          return {
            ...c,
            ...updatedCampaign,
            id: updatedCampaign.id || updatedCampaign._id || c.id || c._id,
            _id: updatedCampaign._id || updatedCampaign.id || c._id || c.id,
            name: updatedCampaign.name || updatedCampaign.title || c.name,
          };
        }
        return c;
      })
    );

    if (user) {
      const donationRecord = {
        campaignId: id,
        campaignName: updatedCampaign.name || getCampaignById(id)?.name,
        amount: Number(amount),
        userEmail: user.email,
        date: new Date().toLocaleString(),
      };
      setDonations((prev) => [...prev, donationRecord]);
    }

    return resp;
  };

  const [donations, setDonations] = useState([]);

  // Fetch user donations from backend
  const fetchDonationsForUser = async (user) => {
    if (!user) return;
    try {
      const data = await getUserDonations({ userId: user.id || user._id, userEmail: user.email });
      setDonations(data);
    } catch (err) {
      // Optionally handle error
    }
  };

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
        fetchDonationsForUser,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

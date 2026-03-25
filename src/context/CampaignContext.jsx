import { createContext, useEffect, useState } from "react";
import { getCampaigns as fetchCampaigns, donateToCampaign as donateApi } from "../services/campaignService";

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
        setCampaigns(data);
      } catch (err) {
        setError(err.message || "Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    };

    loadCampaigns();
  }, []);

  const addCampaign = (campaign) => {
    setCampaigns((prev) => [...prev, campaign]);
  };

  const getCampaignById = (id) => {
    return campaigns.find((c) => c.id === Number(id));
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
        donateToCampaign,
        getCampaignById,
        donations,
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

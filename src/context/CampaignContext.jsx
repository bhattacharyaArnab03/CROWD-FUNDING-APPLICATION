import React, { createContext, useContext, useState, useCallback } from "react";
import * as campaignService from "../services/campaignService";

const CampaignContext = createContext();

export const CampaignProvider = ({ children }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [donations, setDonations] = useState([]);

  // Fetch campaigns using the service
  const fetchCampaigns = useCallback(async () => {
    const data = await campaignService.getCampaigns();
    setCampaigns(data);
  }, []);

  // Fetch donation history
  const fetchDonationHistory = useCallback(async () => {
    const data = await campaignService.getDonationHistory();
    setDonations(data);
    return data;
  }, []);

  // Wrap donateToCampaign to refresh campaigns and donations immediately
  const donateToCampaign = useCallback(async (id, amount, user) => {
    const result = await campaignService.donateToCampaign(id, amount, user);
    await fetchCampaigns();
    await fetchDonationHistory();
    return result;
  }, [fetchCampaigns, fetchDonationHistory]);

  // Expose all service functions, campaigns state, fetchCampaigns, and donation state
  const value = {
    campaigns,
    setCampaigns,
    fetchCampaigns,
    donations,
    setDonations,
    fetchDonationHistory,
    donateToCampaign,
    ...campaignService,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaign = () => useContext(CampaignContext);

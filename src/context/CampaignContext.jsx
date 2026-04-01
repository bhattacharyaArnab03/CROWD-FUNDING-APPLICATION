import React, { createContext, useContext, useState, useCallback } from "react";
import * as campaignService from "../services/campaignService";

const CampaignContext = createContext();

export const CampaignProvider = ({ children }) => {
  const [campaigns, setCampaigns] = useState([]);


  // Fetch campaigns using the service
  const fetchCampaigns = useCallback(async () => {
    const data = await campaignService.getCampaigns();
    setCampaigns(data);
  }, []);

  // Expose all service functions, campaigns state, and fetchCampaigns
  const value = {
    campaigns,
    setCampaigns,
    fetchCampaigns,
    ...campaignService,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaign = () => useContext(CampaignContext);

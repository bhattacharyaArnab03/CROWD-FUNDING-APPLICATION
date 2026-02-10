import { createContext, useState } from "react";

export const CampaignContext = createContext();

export function CampaignProvider({ children }) {

  const [campaigns, setCampaigns] = useState([
    {
      id: 1,
      name: "Save the Forests",
      description: "Plant 10,000 trees in deforested regions.",
      goal: 50000,
      raised: 12000,
      deadline: "2026-03-30",
      status: "Active"
    },
    {
      id: 2,
      name: "Clean Water Initiative",
      description: "Provide clean drinking water to rural villages.",
      goal: 80000,
      raised: 45000,
      deadline: "2026-04-15",
      status: "Active"
    },
    {
      id: 3,
      name: "Education for All",
      description: "Fund school supplies for underprivileged children.",
      goal: 30000,
      raised: 30000,
      deadline: "2026-02-28",
      status: "Funded"
    }
  ]);

  const [donations, setDonations] = useState([]);

  const addCampaign = (campaign) => {
    setCampaigns([...campaigns, campaign]);
  };

  const donateToCampaign = (id, amount, user) => {
    const updatedAmount = Number(amount);

    setCampaigns(
      campaigns.map((c) =>
        c.id === id
          ? {
              ...c,
              raised: c.raised + updatedAmount,
              status:
                c.raised + updatedAmount >= c.goal
                  ? "Funded"
                  : c.status
            }
          : c
      )
    );

    setDonations([
      ...donations,
      {
        campaignId: id,
        campaignName:
          campaigns.find((c) => c.id === id)?.name,
        amount: updatedAmount,
        userEmail: user.email,
        date: new Date().toLocaleString()
      }
    ]);
  };

  return (
    <CampaignContext.Provider
      value={{ campaigns, addCampaign, donateToCampaign, donations }}
    >
      {children}
    </CampaignContext.Provider>
  );
}

const campaigns = [
  { id: 1, title: "Save Trees", goal: 10000, raised: 4500 },
  { id: 2, title: "Clean Water", goal: 20000, raised: 12000 }
];

export function getCampaigns() {
  return campaigns;
}

export function getCampaignById(id) {
  return campaigns.find(c => c.id === Number(id));
}

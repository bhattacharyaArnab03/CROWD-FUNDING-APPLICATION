import { useContext } from "react";
import { useParams } from "react-router-dom";
import { CampaignContext } from "../context/CampaignContext";
import ProgressBar from "../Components/ProgressBar";

function Campaign() {
  const { id } = useParams();
  const { getCampaignById, loading, error } = useContext(CampaignContext);
  const campaign = getCampaignById(id);

  if (loading) return <p>Loading campaign...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!campaign) return <p>Campaign not found.</p>;

  return (
    <div>
      <h2>{campaign.name || campaign.title}</h2>
      <ProgressBar raised={campaign.raised} goal={campaign.goal} />
    </div>
  );
}

export default Campaign;

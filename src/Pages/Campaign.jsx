
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getCampaignById } from "../services/campaignService";
import ProgressBar from "../Components/ProgressBar";

function Campaign() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getCampaignById(id);
        setCampaign(data);
      } catch (err) {
        setError("Failed to load campaign");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

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

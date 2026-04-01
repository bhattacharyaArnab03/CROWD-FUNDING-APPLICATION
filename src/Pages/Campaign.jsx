
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useCampaign } from "../context/CampaignContext";
import ProgressBar from "../Components/ProgressBar";

function Campaign() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [campaign, setCampaign] = useState(null);

  const { getCampaignById } = useCampaign();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getCampaignById(id);
        setCampaign(data);
        setError(null);
      } catch (err) {
        setError("Failed to load campaign");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, getCampaignById]);

  if (loading) 
    return <p>Loading campaign...</p>;
  if (error) 
    return <p>Error: {error}</p>;
  if (!campaign) 
    return <p>Campaign not found.</p>;

  return (
    <div>
      <h2>{campaign.name || campaign.title}</h2>
      <ProgressBar raised={campaign.raised} goal={campaign.goal} />
    </div>
  );
}

export default Campaign;

import { useEffect, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useCampaign } from "../context/CampaignContext";
import CampaignCard from "../Components/CampaignCard";
import "./Explore.css";

function Explore() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { campaigns, fetchCampaigns } = useCampaign();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await fetchCampaigns();
      setLoading(false);
    };
    fetchData();
  }, [fetchCampaigns]);

  return (
    <div className="explore-page">
      {/* HERO */}
      <div className="explore-hero">
        <div className="hero-content">
          <h1>Explore Campaigns</h1>
          <p>
            Support meaningful causes and track campaign progress.
          </p>
        </div>
      </div>

      <div className="campaign-section">
        {loading ? (
          <div className="no-campaigns"><h3>Loading campaigns...</h3></div>
        ) : campaigns.length === 0 ? (
          <div className="no-campaigns">
            <h3>No campaigns available</h3>
            <p>Campaigns will appear here once created.</p>
          </div>
        ) : (
          <div className="card-grid">
            {campaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id || campaign._id}
                campaign={campaign}
                user={user}
                onDonate={(campaignId) => navigate(`/payment/${campaignId}`)}
                onLogin={() => navigate("/auth")}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Explore;

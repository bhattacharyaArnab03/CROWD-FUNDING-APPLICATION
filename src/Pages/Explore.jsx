

import { useEffect, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { getCampaigns } from "../services/campaignService";
import { AuthContext } from "../context/AuthContext";
import CampaignCard from "../Components/CampaignCard";
import "./Explore.css";


function Explore() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getCampaigns();
        setCampaigns(data);
      } catch (err) {
        setError("Failed to load campaigns");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
        ) : error ? (
          <div className="no-campaigns"><h3>{error}</h3></div>
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

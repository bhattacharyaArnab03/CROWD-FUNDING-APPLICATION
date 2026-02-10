import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CampaignContext } from "../context/CampaignContext";
import { AuthContext } from "../context/AuthContext";
import "./Explore.css";

function Explore() {
  const { campaigns } = useContext(CampaignContext);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

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
        {campaigns.length === 0 ? (
          <div className="no-campaigns">
            <h3>No campaigns available</h3>
            <p>Campaigns will appear here once created.</p>
          </div>
        ) : (
          <div className="card-grid">
            {campaigns.map((campaign) => {
              const progress =
                campaign.goal > 0
                  ? (campaign.raised / campaign.goal) * 100
                  : 0;

              return (
                <div className="campaign-card" key={campaign.id}>

                  <div className="card-content">
                    <h3>{campaign.name}</h3>

                    <p className="description">
                      {campaign.description}
                    </p>

                    <p className="deadline">
                      Deadline: {campaign.deadline}
                    </p>

                    {/* Progress */}
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>

                    <div className="fund-info">
                      <span>₹{campaign.raised} Raised</span>
                      <span>Goal ₹{campaign.goal}</span>
                    </div>

                    {/* Role-Based Button */}
                    {user?.role === "user" && (
                      <button
                        className="view-btn"
                        onClick={() =>
                          navigate(`/payment/${campaign.id}`)
                        }
                      >
                        Donate
                      </button>
                    )}

                    {!user && (
                      <button
                        className="view-btn"
                        onClick={() => navigate("/auth")}
                      >
                        Login to Donate
                      </button>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

export default Explore;

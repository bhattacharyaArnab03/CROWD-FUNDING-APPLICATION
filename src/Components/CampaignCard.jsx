import ProgressBar from "./ProgressBar";
import "./CampaignCard.css";

function CampaignCard({ campaign, user, onDonate, onLogin }) {
  const campaignId = campaign.id || campaign._id;
  return (
    <div className="campaign-card" key={campaignId}>
      <div className="card-content">
        <h3>{campaign.name || campaign.title}</h3>
        <p className="description">{campaign.description}</p>
        <p className="deadline">Deadline: {campaign.deadline ? campaign.deadline.slice(0, 10) : ''}</p>
        {/* Progress */}
        <ProgressBar raised={campaign.raised} goal={campaign.goal} />
        <div className="fund-info">
          <span>₹{campaign.raised} Raised</span>
          <span>Goal ₹{campaign.goal}</span>
        </div>
        {/* Role-Based Button */}
        {user?.role === "user" && (
          campaign.status === "Completed" ? (
            <button
              className="view-btn completed-btn"
              disabled
              type="button"
            >
              Completed
            </button>
          ) : (
            <button
              className="view-btn"
              onClick={() => onDonate(campaignId)}
            >
              Donate
            </button>
          )
        )}
        {!user && (
          <button
            className="view-btn"
            onClick={onLogin}
          >
            Login to Donate
          </button>
        )}
      </div>
    </div>
  );
}

export default CampaignCard;

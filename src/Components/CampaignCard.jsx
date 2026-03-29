
function CampaignCard({ campaign, user, onDonate, onLogin }) {
  const progress = campaign.goal > 0 ? (campaign.raised / campaign.goal) * 100 : 0;
  const campaignId = campaign.id || campaign._id;
  return (
    <div className="campaign-card" key={campaignId}>
      <div className="card-content">
        <h3>{campaign.name}</h3>
        <p className="description">{campaign.description}</p>
        <p className="deadline">Deadline: {campaign.deadline ? campaign.deadline.slice(0, 10) : ''}</p>
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
          campaign.status === "Completed" ? (
            <button
              className="view-btn completed-btn"
              onClick={() => onDonate(campaignId)}
              style={{ color: "#fff", background: "#e53935" }}
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

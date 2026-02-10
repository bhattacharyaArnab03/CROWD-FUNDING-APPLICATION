import { Link } from "react-router-dom";

function CampaignCard({ campaign }) {
  return (
    <div className="card">
      <h3>{campaign.title}</h3>
      <p>Goal: ₹{campaign.goal}</p>
      <p>Raised: ₹{campaign.raised}</p>
      <Link to={`/campaign/${campaign.id}`}>View</Link>
    </div>
  );
}

export default CampaignCard;

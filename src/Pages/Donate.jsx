import { useParams } from "react-router-dom";
import { getCampaignById } from "../services/campaignService";
import { donate } from "../services/donationService";

function Donate() {
  const { id } = useParams();
  const campaign = getCampaignById(id);

  function handleDonate() {
    donate(campaign, 500);
    alert("Donation Successful");
  }

  return (
    <div>
      <h2>Donate to {campaign.title}</h2>
      <button onClick={handleDonate}>Donate ₹500</button>
    </div>
  );
}

export default Donate;

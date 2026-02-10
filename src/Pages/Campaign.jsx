import { useParams } from "react-router-dom";
import { getCampaignById } from "../services/campaignService";
import ProgressBar from "../Components/ProgressBar";

function Campaign() {
  const { id } = useParams();
  const campaign = getCampaignById(id);

  return (
    <div>
      <h2>{campaign.title}</h2>
      <ProgressBar raised={campaign.raised} goal={campaign.goal} />
    </div>
  );
}

export default Campaign;

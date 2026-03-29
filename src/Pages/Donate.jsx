import { useContext, useState } from "react";
import { useParams } from "react-router-dom";
import { CampaignContext } from "../context/CampaignContext";
import { AuthContext } from "../context/AuthContext";

function Donate() {
  const { id } = useParams();
  const { getCampaignById, donateToCampaign, loading, error } = useContext(CampaignContext);
  const { user } = useContext(AuthContext);

  const [amount, setAmount] = useState("");

  const campaign = getCampaignById(id);

  if (loading) 
    return <p>Loading campaign...</p>;
  if (error) 
    return <p>Error: {error}</p>;
  if (!campaign) 
    return <p>Campaign not found.</p>;

  async function handleDonate(e) {
    e.preventDefault();
    const donationAmount = Number(amount);
    if (!donationAmount || donationAmount <= 0) {
      alert("Please enter a valid donation amount.");
      return;
    }
    try {
      await donateToCampaign(campaign.id, donationAmount, user);
      alert("Donation Successful");
      setAmount("");
    } 
    catch (err) {
      alert("Donation failed: " + (err.message || "Unknown error"));
    }
  }

  return (
    <div>
      <h2>Donate to {campaign.name || campaign.title}</h2>
      <form onSubmit={handleDonate}>
        <input
          type="number"
          placeholder="Enter donation amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
          required
        />
        <button type="submit">Donate</button>
      </form>
    </div>
  );
}

export default Donate;
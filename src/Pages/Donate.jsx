
import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { getCampaignById, donateToCampaign } from "../services/campaignService";
import { AuthContext } from "../context/AuthContext";

function Donate() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getCampaignById(id);
        setCampaign(data);
      } catch (err) {
        setError("Failed to load campaign");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  if (loading) return <p>Loading campaign...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!campaign) return <p>Campaign not found.</p>;

  async function handleDonate(e) {
    e.preventDefault();
    const donationAmount = Number(amount);
    if (!donationAmount || donationAmount <= 0) {
      alert("Please enter a valid donation amount.");
      return;
    }
    try {
      await donateToCampaign(campaign.id || campaign._id, donationAmount, user);
      alert("Donation Successful");
      setAmount("");
    } catch (err) {
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
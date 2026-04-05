
import { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { useCampaign } from "../context/CampaignContext";
import { AuthContext } from "../context/AuthContext";

function Donate() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [amount, setAmount] = useState("");
  const [campaign, setCampaign] = useState(null);

  const { getCampaignById, donateToCampaign } = useCampaign();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getCampaignById(id);
        setCampaign(data);
        setError(null);
      } catch (err) {
        setError("Failed to load campaign");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, getCampaignById]);

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
      const errorMessage = err.response?.data?.message || err.message || "Unknown error";
      alert("Donation failed: " + errorMessage);
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
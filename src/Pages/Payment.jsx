

import { useParams } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { useCampaign } from "../context/CampaignContext";
import { AuthContext } from "../context/AuthContext";
import "./Payment.css";

function Payment() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [campaign, setCampaign] = useState(null);
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [donationError, setDonationError] = useState("");
  const [loading, setLoading] = useState(true);
  const { getCampaignById, donateToCampaign } = useCampaign();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getCampaignById(id);
        setCampaign(data);
      } catch {
        setCampaign(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, getCampaignById]);

  if (loading) {
    return (
      <div className="payment-page">
        <div className="payment-card">
          <h2>Loading campaign...</h2>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="payment-page">
        <div className="payment-card">
          <h2>Campaign not found</h2>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="payment-page">
        <div className="payment-card">
          <h2>Please log in to donate.</h2>
        </div>
      </div>
    );
  }

  const remainingAmount = Math.max(0, campaign.goal - campaign.raised);

  const handlePayment = async (e) => {
    e.preventDefault();
    const donationAmount = Number(amount);
    if (!donationAmount || donationAmount <= 0) {
      const message = "Please enter a valid donation amount.";
      setDonationError(message);
      alert(message);
      return;
    }

    if (remainingAmount <= 0) {
      const message = "This campaign is already fully funded.";
      setDonationError(message);
      alert(message);
      return;
    }

    if (donationAmount > remainingAmount) {
      const message = `Donation exceeds remaining goal amount. You can donate up to ₹${remainingAmount}.`;
      setDonationError(message);
      alert(message);
      return;
    }

    try {
      const resp = await donateToCampaign(campaign.id || campaign._id, donationAmount, user);
      setDonationError("");
      // Fallbacks for campaign name and transaction number
      const campaignName = resp.campaign?.title || resp.campaign?.name || campaign.title || campaign.name || "Unknown";
      const transactionNumber = resp.donation?.transactionNumber || resp.donation?.transactionId || resp.donation?._id || "N/A";
      setReceipt({
        campaignName,
        transactionNumber,
        userEmail: user?.email,
        amount: donationAmount,
        date: new Date().toLocaleString(),
        goal: resp.campaign?.goal || campaign.goal,
        raised: resp.campaign?.raised || campaign.raised + donationAmount,
      });
    } catch (err) {
      setDonationError(err.message || "Donation failed");
      alert(err.message || "Donation failed");
    }
  };

  return (
    <div className="payment-page">
      <div className="payment-card">
        {receipt ? (
          <div className="receipt">
            <h3>Receipt</h3>
            <p>Transaction ID: {receipt.transactionNumber || "N/A"}</p>
            <p>Campaign: {receipt.campaignName || "Unknown"}</p>
            <p>Email: {receipt.userEmail}</p>
            <p>Amount: ₹{receipt.amount}</p>
            <p>Date: {receipt.date}</p>
            <p>Goal: ₹{receipt.goal}</p>
            <p>Raised: ₹{receipt.raised}</p>
          </div>
        ) : (
          <>
            <h2>Payment for {campaign.name}</h2>
            <form onSubmit={handlePayment}>
              <input
                type="number"
                placeholder="Enter donation amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max={remainingAmount}
                required
              />
              <button
                type="submit"
                disabled={!amount || Number(amount) <= 0}
              >
                Proceed to Pay
              </button>
            </form>
            {donationError && <p className="donation-error">{donationError}</p>}
            <p className="donation-note">Remaining goal amount: ₹{remainingAmount}</p>
          </>
        )}
      </div>
    </div>
  );

}
export default Payment;


import { useParams, useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { CampaignContext } from "../context/CampaignContext";
import { AuthContext } from "../context/AuthContext";
import "./Payment.css";



function Payment() {
  const { id } = useParams();
  const { campaigns, donateToCampaign } = useContext(CampaignContext);
  const { user } = useContext(AuthContext);
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [donationError, setDonationError] = useState("");
  const navigate = useNavigate();

  const campaign = campaigns.find(
    (c) => String(c.id || c._id) === String(id)
  );


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
      await donateToCampaign(campaign.id, donationAmount, user);
      setDonationError("");
      setReceipt({
        campaignName: campaign.name,
        userEmail: user?.email,
        amount: donationAmount,
        date: new Date().toLocaleString(),
        goal: campaign.goal,
        raised: campaign.raised + donationAmount,
      });
      setAmount("");
    } catch (err) {
      const message = err.response?.data?.message || err.message || "Donation failed.";
      setDonationError(message);
      alert(message);
    }
  };

  return (
    <div className="payment-page">
      <div className="payment-card">
        {receipt ? (
          <div className="receipt">
            <h2>Payment Successful!</h2>
            <h3>Donation Receipt</h3>
            <p><strong>Campaign:</strong> {receipt.campaignName}</p>
            <p><strong>Donor Email:</strong> {receipt.userEmail}</p>
            <p><strong>Amount:</strong> ₹{receipt.amount}</p>
            <p><strong>Date:</strong> {receipt.date}</p>
            <p><strong>Goal:</strong> ₹{receipt.goal}</p>
            <p><strong>Total Raised (after donation):</strong> ₹{receipt.raised}</p>
            <button onClick={() => navigate("/dashboard")}>Go to Dashboard</button>
          </div>
        ) : (
          <>
            <h2>Donate to {campaign.name}</h2>
            <div className="campaign-info">
              <p><strong>Goal:</strong> ₹{campaign.goal}</p>
              <p><strong>Raised:</strong> ₹{campaign.raised}</p>
              <p><strong>Deadline:</strong> {campaign.deadline}</p>
            </div>
            {remainingAmount <= 0 ? (
              <div className="campaign-closed">
                <p>This campaign is already fully funded.</p>
                <button onClick={() => navigate("/dashboard")}>Back to Dashboard</button>
              </div>
            ) : (
              <>
                <form onSubmit={handlePayment}>
                  <input
                    type="number"
                    placeholder={`Enter donation amount (up to ₹${remainingAmount})`}
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      if (donationError) setDonationError("");
                    }}
                    required
                    min="1"
                    max={remainingAmount}
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
          </>
        )}
      </div>
    </div>
  );
}

export default Payment;

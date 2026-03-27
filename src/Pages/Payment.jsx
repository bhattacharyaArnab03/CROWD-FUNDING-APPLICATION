
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

  const handlePayment = async (e) => {
    e.preventDefault();
    const donationAmount = Number(amount);
    if (!donationAmount || donationAmount <= 0) {
      alert("Please enter a valid donation amount.");
      return;
    }
    // Simulate donation and generate receipt
    await donateToCampaign(campaign.id, donationAmount, user);
    setReceipt({
      campaignName: campaign.name,
      userEmail: user?.email,
      amount: donationAmount,
      date: new Date().toLocaleString(),
      goal: campaign.goal,
      raised: campaign.raised + donationAmount,
    });
    setAmount("");
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
            <button onClick={() => window.location.href = "/dashboard"}>Go to Dashboard</button>
          </div>
        ) : (
          <>
            <h2>Donate to {campaign.name}</h2>
            <div className="campaign-info">
              <p><strong>Goal:</strong> ₹{campaign.goal}</p>
              <p><strong>Raised:</strong> ₹{campaign.raised}</p>
              <p><strong>Deadline:</strong> {campaign.deadline}</p>
            </div>
            <form onSubmit={handlePayment}>
              <input
                type="number"
                placeholder="Enter donation amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <button type="submit">
                Proceed to Pay
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default Payment;

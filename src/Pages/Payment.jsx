import { useParams, useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { CampaignContext } from "../context/CampaignContext";
import { AuthContext } from "../context/AuthContext";
import "./Payment.css";

function Payment() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { campaigns, donateToCampaign } = useContext(CampaignContext);
  const { user } = useContext(AuthContext);

  const [amount, setAmount] = useState("");

  const campaign = campaigns.find(
    (c) => c.id === Number(id)
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

  const handlePayment = (e) => {
    e.preventDefault();

    const donationAmount = Number(amount);

    if (!donationAmount || donationAmount <= 0) {
      alert("Please enter a valid donation amount.");
      return;
    }

    donateToCampaign(campaign.id, donationAmount, user);

    alert("Payment Successful!");

    navigate("/dashboard");
  };

  return (
    <div className="payment-page">

      <div className="payment-card">

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

      </div>

    </div>
  );
}

export default Payment;

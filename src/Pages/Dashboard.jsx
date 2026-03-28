import { useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { CampaignContext } from "../context/CampaignContext";
import "./Dashboard.css";


function Dashboard() {
  const { user } = useContext(AuthContext);
  const { donations, fetchDonationsForUser, campaigns } = useContext(CampaignContext);

  useEffect(() => {
    fetchDonationsForUser && fetchDonationsForUser(user);
  }, [user]);

  const userDonations = donations.filter(
    (d) => (d.userEmail || d.donorEmail) === user?.email
  );

  const getCampaignName = (donation) => {
    if (donation.campaignName) return donation.campaignName;
    const campaign = campaigns.find(
      (c) => String(c.id || c._id) === String(donation.campaignId)
    );
    return campaign ? campaign.name : "[Unknown Campaign]";
  };

  const totalDonated = userDonations.reduce(
    (sum, d) => sum + d.amount,
    0
  );

  return (
    <div className="dashboard-page">

      <div className="dashboard-hero">
        <h1>Welcome, {user?.name}</h1>
        <p>Your contribution impact overview</p>
      </div>

      <div className="dashboard-section">

        <div className="stats-grid">
          <div className="stat-card">
            <h3>₹{totalDonated}</h3>
            <p>Total Donated</p>
          </div>

          <div className="stat-card">
            <h3>{userDonations.length}</h3>
            <p>Total Donations</p>
          </div>
        </div>

        <div className="activity-section">
          <h2>Recent Activity</h2>

          {userDonations.length === 0 ? (
            <p>No donations yet.</p>
          ) : (
            userDonations.map((d, index) => (
              <div className="activity-card" key={index}>
                <p>
                  Donated <strong>₹{d.amount}</strong> to{" "}
                  <strong>{getCampaignName(d)}</strong>
                </p>
                <span>{d.date}</span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}

export default Dashboard;


import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { getUserDonations, getCampaigns } from "../services/campaignService";
import "./Dashboard.css";

function Dashboard() {
  const { user } = useContext(AuthContext);
  const [donations, setDonations] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [donationData, campaignData] = await Promise.all([
          getUserDonations({ userId: user?.id || user?._id, userEmail: user?.email }),
          getCampaigns(),
        ]);
        setDonations(donationData);
        setCampaigns(campaignData);
      } catch (err) {
          setError("Failed to fetch campaigns");
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchData();
  }, [user]);

  // Sort donations by date descending (most recent first)
  const userDonations = donations
    .filter((d) => (d.userEmail || d.donorEmail) === user?.email)
    .sort((a, b) => {
      const dateA = new Date(a.donatedAt || a.date);
      const dateB = new Date(b.donatedAt || b.date);
      return dateB - dateA;
    });

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

        <div className="history-section">
          <h2>Donation History</h2>
          {loading ? (
            <p>Loading...</p>
          ) : userDonations.length === 0 ? (
            <p>No donations yet.</p>
          ) : (
            <div className="history-table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Txn #</th>
                    <th>Amount</th>
                    <th>Campaign</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {userDonations.map((donation, idx) => (
                    <tr key={donation._id || donation.transactionNumber || idx}>
                      <td>{donation.transactionNumber}</td>
                      <td>₹{donation.amount}</td>
                      <td>{getCampaignName(donation)}</td>
                      <td>{new Date(donation.donatedAt || donation.date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

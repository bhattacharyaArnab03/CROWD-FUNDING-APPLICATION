import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { useCampaign } from "../context/CampaignContext";
import { getIsNewUser } from "../services/campaignService";
import "./Dashboard.css";

function Dashboard() {
  const { user } = useContext(AuthContext);
  const { campaigns, donations, fetchCampaigns, fetchDonationHistory } = useCampaign();
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        await Promise.all([
          fetchDonationHistory(),
          fetchCampaigns(),
        ]);
        // Check if user is new (event consumed)
        if (user && user.id) {
          const res = await getIsNewUser(user.id);
          setShowWelcome(res.isNew === true);
        } else {
          setShowWelcome(false);
        }
      } catch (err) {
        setShowWelcome(false);
      } finally {
        setLoading(false);
      }
    }
    if (user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Sort donations by date descending (most recent first)
  const userDonations = (donations || [])
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

  const totalPages = Math.ceil(userDonations.length / itemsPerPage);
  const paginatedDonations = userDonations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="dashboard-page">
      {/* Fullscreen Welcome Modal Overlay */}
      {!loading && showWelcome && !welcomeDismissed && (
        <div className="welcome-modal-overlay">
          <div className="welcome-modal-content">
            <button
              className="welcome-close-btn modal-close-btn"
              aria-label="Close welcome message"
              onClick={() => setWelcomeDismissed(true)}
            >
              &times;
            </button>
            <span role="img" aria-label="Party" className="welcome-emoji modal-emoji">🎉</span>
            <h2>Welcome, {user?.name}!</h2>
            <p className="modal-main-text">We're excited to have you join our community.<br/>Begin your first donation to make an impact.</p>
            <p className="welcome-subtext modal-subtext">You can close this message to start exploring your dashboard.</p>
          </div>
        </div>
      )}
      {/* Dashboard content only visible after welcome is dismissed */}
      {(!showWelcome || welcomeDismissed) && (
        <>
          <div className="dashboard-hero">
            <h1>Welcome, {user?.name}</h1>
            <p>Your contribution impact overview</p>
          </div>

          <div className="dashboard-section">
            <div className="stats-grid">
              <div className="stat-card">
                <h3>{loading ? "..." : `₹${totalDonated}`}</h3>
                <p>Total Donated</p>
              </div>
              <div className="stat-card">
                <h3>{loading ? "..." : userDonations.length}</h3>
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
                <>
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
                        {paginatedDonations.map((donation, idx) => (
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
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      >
                        Previous
                      </button>
                      <span>Page {currentPage} of {totalPages}</span>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Dashboard;

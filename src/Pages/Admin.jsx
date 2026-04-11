

import { useEffect, useState } from "react";
import { useCampaign } from "../context/CampaignContext";
import "./Admin.css";
import CampaignCard from "../Components/CampaignCard";


const Admin = () => {
  const { campaigns, fetchCampaigns, createCampaign, updateCampaign, donations, fetchDonationHistory } = useCampaign();
  // Defensive: ensure donations is always an array
  const safeDonationHistory = Array.isArray(donations) ? donations : [];
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editRaised, setEditRaised] = useState("");

  const [editError, setEditError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [activeTab, setActiveTab] = useState("create");

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    async function fetchData() {
      try {
        await fetchCampaigns();
      } catch {
        setError("Failed to load campaigns");
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!deadline || deadline < today) {
      setError("Please select today or a future date for campaign deadline.");
      return;
    }
    if (!goal || Number(goal) <= 0) {
      setError("Goal amount must be a positive number.");
      return;
    }

    setError("");
    setSuccess("");
    const newEvent = {
      title: name,
      description,
      goal: Number(goal),
      raised: 0,
      deadline,
      status: "Active",
    };

    try {
      const created = await createCampaign(newEvent);
      fetchCampaigns();
      setName("");
      setGoal("");
      setDescription("");
      setDeadline("");
      setSuccess("Campaign created successfully.");
    } catch {
      setError("Unable to create campaign. Please try again.");
      setSuccess("");
    }
  };


  const startEditCampaign = (campaign) => {
    setEditingCampaignId(campaign.id || campaign._id);
    setEditName(campaign.name || campaign.title || "");
    setEditGoal(campaign.goal);
    setEditDescription(campaign.description);
    setEditDeadline(campaign.deadline ? campaign.deadline.toString().slice(0, 10) : "");
    setEditRaised(campaign.raised);
    setEditError("");
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const loadHistory = async () => {
      try {
        await fetchDonationHistory();
      } catch {
        setHistoryError("Unable to load donation history.");
      }
    };
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cancelEdit = () => {
    setEditingCampaignId(null);
    setEditError("");
  };


  const saveEditCampaign = async (campaignId) => {
    if (!editName || !editDescription || !editDeadline || !editGoal) {
      setEditError("All fields are required when updating campaign details.");
      return;
    }

    if (editDeadline < today) {
      setEditError("Deadline must be today or in the future.");
      return;
    }

    const updates = {
      title: editName,
      description: editDescription,
      goal: Number(editGoal),
      deadline: editDeadline,
      raised: Number(editRaised),
    };

    try {
      await updateCampaign(campaignId, updates);
      fetchCampaigns();
      setEditingCampaignId(null);
      setEditError("");
    } catch {
      setEditError("Unable to update campaign currently.");
    }
  };

  return (
    <div className="admin-page">

      {/* HERO */}
      <div className="admin-hero">
        <h1 style={{ marginTop: '5rem' }}>Admin Dashboard</h1>
        <p>Create and manage fundraising campaigns</p>
      </div>

      <div className="admin-container">
        <div className="admin-tab-bar">
          <button
            type="button"
            className={activeTab === "create" ? "admin-tab active" : "admin-tab"}
            onClick={() => setActiveTab("create")}
          >
            Create Campaign
          </button>
          <button
            type="button"
            className={activeTab === "campaigns" ? "admin-tab active" : "admin-tab"}
            onClick={() => { setActiveTab("campaigns"); setCurrentPage(1); }}
          >
            Campaign Details
          </button>
          <button
            type="button"
            className={activeTab === "transactions" ? "admin-tab active" : "admin-tab"}
            onClick={() => { setActiveTab("transactions"); setCurrentPage(1); }}
          >
            Transaction Details
          </button>
        </div>

        {activeTab === "create" ? (
          <>
            <div className="create-section" style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
              <div className="create-card">
                <form className="admin-form" onSubmit={handleCreate}>
                  <input
                    type="text"
                    placeholder="Campaign Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />

                  <input
                    type="number"
                    placeholder="Goal Amount"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    required
                  />

                  <input
                    type="date"
                    value={deadline}
                    min={today}
                    onChange={(e) => {
                      setDeadline(e.target.value);
                      setError("");
                    }}
                    required
                  />

                  {error && <p className="admin-error">{error}</p>}

                  <input
                    type="text"
                    placeholder="Short Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />

                  <button type="submit">Create Campaign</button>
                </form>
              </div>
              {success && (
                <div className="create-card" style={{marginTop: '0px', textAlign: 'center', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', padding: '4px 0'}}>
                  <p className="admin-success">{success}</p>
                </div>
              )}
            </div>
          </>
        ) : activeTab === "campaigns" ? (
          <div className="admin-grid">
            {campaigns.map((campaign) => {
              const campaignId = campaign.id || campaign._id;
              if (editingCampaignId === String(campaignId)) {
                return (
                  <div className="admin-card" key={campaignId}>
                    <h3>Editing: {campaign.name}</h3>
                    <form className="admin-form" onSubmit={(e) => { e.preventDefault(); saveEditCampaign(campaignId); }}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        required
                      />
                      <input
                        type="number"
                        value={editGoal}
                        onChange={(e) => setEditGoal(e.target.value)}
                        required
                      />
                      <input
                        type="date"
                        min={today}
                        value={editDeadline}
                        onChange={(e) => setEditDeadline(e.target.value)}
                        required
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        required
                      />
                      {/* Removed the 'raised' input field as requested */}
                      {editError && <p className="admin-error">{editError}</p>}
                      <div className="card-actions">
                        <button type="submit" className="save-btn">Save</button>
                        <button type="button" className="cancel-btn" onClick={cancelEdit}>Cancel</button>
                      </div>
                    </form>
                  </div>
                );
              }
              // Use CampaignCard for display
              return (
                <div className="admin-card" key={campaignId}>
                  <CampaignCard
                    campaign={campaign}
                    user={{ role: "admin" }}
                    onDonate={() => {}}
                    onLogin={() => {}}
                  />
                  <div className="card-actions">
                    <button type="button" className="edit-btn" onClick={() => startEditCampaign(campaign)}>
                      Edit Campaign
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : activeTab === "transactions" ? (
          <div className="history-section">
            <h2>Donation History</h2>
            {historyError && <p className="admin-error">{historyError}</p>}
            {safeDonationHistory.length === 0 ? (
              <p>No donations have been recorded yet.</p>
            ) : (
              <>
                <div className="history-table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Txn #</th>
                        <th>Email</th>
                        <th>Username</th>
                        <th>Amount</th>
                        <th>Campaign</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...safeDonationHistory]
                        .sort((a, b) => new Date(b.donatedAt) - new Date(a.donatedAt))
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((donation) => (
                          <tr key={donation._id || donation.transactionNumber}>
                            <td>{donation.transactionNumber}</td>
                            <td>{donation.donorEmail}</td>
                            <td>{donation.donorName}</td>
                            <td>₹{donation.amount}</td>
                            <td>{donation.campaignName}</td>
                            <td>{donation.donatedAt ? new Date(donation.donatedAt).toLocaleString() : "-"}</td>
                          </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination Controls */}
                {Math.ceil(safeDonationHistory.length / itemsPerPage) > 1 && (
                  <div className="pagination">
                    <button 
                      disabled={currentPage === 1} 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                      Previous
                    </button>
                    <span>Page {currentPage} of {Math.ceil(safeDonationHistory.length / itemsPerPage)}</span>
                    <button 
                      disabled={currentPage === Math.ceil(safeDonationHistory.length / itemsPerPage)} 
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(safeDonationHistory.length / itemsPerPage)))}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Admin;

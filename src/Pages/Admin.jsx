import { useState, useContext } from "react";
import { CampaignContext } from "../context/CampaignContext";
import { updateCampaign as updateCampaignApi } from "../services/campaignService";
import "./Admin.css";

function Admin() {
  const { campaigns, addCampaign, updateCampaign } = useContext(CampaignContext);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState("");

  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editRaised, setEditRaised] = useState("");

  const [editError, setEditError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  const handleCreate = async (e) => {
    e.preventDefault();

    if (!deadline || deadline < today) {
      setError("Please select today or a future date for campaign deadline.");
      return;
    }

    setError("");
    const newEvent = {
      name,
      description,
      goal: Number(goal),
      raised: 0,
      deadline,
      status: "Active",
    };

    try {
      await addCampaign(newEvent);
      setName("");
      setGoal("");
      setDescription("");
      setDeadline("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to create campaign. Please try again.");
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
      name: editName,
      description: editDescription,
      goal: Number(editGoal),
      deadline: editDeadline,
      raised: Number(editRaised),
    };

    try {
      await updateCampaignApi(campaignId, updates);
      updateCampaign(campaignId, updates);
      setEditingCampaignId(null);
      setEditError("");
    } catch (err) {
      setEditError(err.response?.data?.message || "Unable to update campaign currently.");
    }
  };

  return (
    <div className="admin-page">

      {/* HERO */}
      <div className="admin-hero">
        <h1>Admin Dashboard</h1>
        <p>Create and manage fundraising campaigns</p>
      </div>

      <div className="admin-container">

        {/* CREATE CAMPAIGN */}
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

        {/* CAMPAIGN GRID */}
        <div className="admin-grid">
          {campaigns.map((campaign) => {
            const progress =
              campaign.goal > 0
                ? (campaign.raised / campaign.goal) * 100
                : 0;

            const campaignId = campaign.id || campaign._id;

            if (editingCampaignId === String(campaignId)) {
              return (
                <div className="admin-card" key={campaignId}>
                  <h3>Editing: {campaign.name}</h3>
                  <form className="admin-form" onSubmit={(e) => {e.preventDefault(); saveEditCampaign(campaignId);}}>
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
                    <input
                      type="number"
                      value={editRaised}
                      onChange={(e) => setEditRaised(e.target.value)}
                      min="0"
                      required
                    />
                    {editError && <p className="admin-error">{editError}</p>}
                    <div className="card-actions">
                      <button type="submit" className="save-btn">Save</button>
                      <button type="button" className="cancel-btn" onClick={cancelEdit}>Cancel</button>
                    </div>
                  </form>
                </div>
              );
            }

            return (
              <div className="admin-card" key={campaignId}>
                <div className="card-header">
                  <h3>{campaign.name}</h3>
                  <span className={`status ${campaign.status.toLowerCase()}`}>
                    {campaign.status}
                  </span>
                </div>

                <p className="description">{campaign.description}</p>
                <p className="deadline">Deadline: {campaign.deadline}</p>

                {/* Progress */}
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>

                <div className="amounts">
                  <span>₹{campaign.raised}</span>
                  <span>₹{campaign.goal}</span>
                </div>

                <div className="card-actions">
                  <button type="button" className="edit-btn" onClick={() => startEditCampaign(campaign)}>
                    Edit Campaign
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default Admin;

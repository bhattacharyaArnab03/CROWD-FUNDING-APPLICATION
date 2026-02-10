import { useState, useContext } from "react";
import { CampaignContext } from "../context/CampaignContext";
import "./Admin.css";

function Admin() {
  const { campaigns, addCampaign } = useContext(CampaignContext);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");

  const handleCreate = (e) => {
    e.preventDefault();

    const newEvent = {
      id: Date.now(),
      name,
      description,
      goal: Number(goal),
      raised: 0,
      deadline,
      status: "Active"
    };

    addCampaign(newEvent);

    setName("");
    setGoal("");
    setDescription("");
    setDeadline("");
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
              onChange={(e) => setDeadline(e.target.value)}
              required
            />

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

            return (
              <div className="admin-card" key={campaign.id}>

                <div className="card-header">
                  <h3>{campaign.name}</h3>
                  <span className={`status ${campaign.status.toLowerCase()}`}>
                    {campaign.status}
                  </span>
                </div>

                <p className="description">
                  {campaign.description}
                </p>

                <p className="deadline">
                  Deadline: {campaign.deadline}
                </p>

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

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default Admin;

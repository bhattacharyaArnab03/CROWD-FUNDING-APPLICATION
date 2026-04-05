import { useEffect, useContext, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useCampaign } from "../context/CampaignContext";
import CampaignCard from "../Components/CampaignCard";
import "./Explore.css";

function Explore() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { campaigns, fetchCampaigns, getDonationHistory } = useCampaign();
  const [loading, setLoading] = useState(true);

  // Search / view state
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [viewMode, setViewMode] = useState("featured"); // featured | trending | latest | all

  const [donations, setDonations] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await fetchCampaigns();
        if (getDonationHistory) {
          const d = await getDonationHistory();
          setDonations(d || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [fetchCampaigns, getDonationHistory]);

  const handleSearch = () => setAppliedQuery(query.trim());

  // Aggregate donations by campaign and compute recent 7-day sum
  const donationsByCampaign = useMemo(() => {
    const map = {};
    const now = Date.now();
    const DAY_MS = 1000 * 60 * 60 * 24;
    for (const d of donations) {
      const cid = d.campaignId || (d.campaign && (d.campaign._id || d.campaign.id)) || d.campaignIdString;
      if (!cid) continue;
      if (!map[cid]) map[cid] = { count: 0, sum: 0, recent7: 0 };
      const amount = Number(d.amount || 0);
      map[cid].count += 1;
      map[cid].sum += amount;
      const donatedAt = d.donatedAt ? new Date(d.donatedAt).getTime() : null;
      if (donatedAt && now - donatedAt <= 7 * DAY_MS) map[cid].recent7 += amount;
    }
    return map;
  }, [donations]);

  // Featured: top 3 by raised
  const featured = useMemo(() => {
    return [...(campaigns || [])]
      .sort((a, b) => (b.raised || 0) - (a.raised || 0))
      .slice(0, 3);
  }, [campaigns]);

  // Latest: newest 6
  const latest = useMemo(() => {
    return [...(campaigns || [])]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);
  }, [campaigns]);

  // Trending: composite score (fulfillment speed + recent 7-day momentum + urgency)
  const trending = useMemo(() => {
    const now = Date.now();
    const DAY_MS = 1000 * 60 * 60 * 24;
    const w1 = 0.5, w2 = 0.4, w3 = 0.1;
    return [...(campaigns || [])]
      .map((c) => {
        const id = c._id || c.id;
        const goal = Number(c.goal) || 0;
        const raised = Number(c.raised) || 0;
        const created = c.createdAt ? new Date(c.createdAt).getTime() : now;
        const days = Math.max(1, (now - created) / DAY_MS);
        const progress = goal > 0 ? Math.min(1, raised / goal) : goal === 0 && raised > 0 ? 1 : 0;
        const speed = progress / days; // fraction of goal per day
        const recent7 = donationsByCampaign[id]?.recent7 || 0;
        const recentFraction = goal > 0 ? Math.min(1, recent7 / goal) : recent7 > 0 ? 1 : 0;
        let urgency = 0;
        if (c.deadline) {
          const daysLeft = Math.ceil((new Date(c.deadline).getTime() - now) / DAY_MS);
          if (daysLeft <= 7) urgency = 1;
        }
        const score = w1 * speed + w2 * recentFraction + w3 * urgency;
        return { campaign: c, score, raised };
      })
      .sort((a, b) => {
        if (b.score === a.score) return b.raised - a.raised;
        return b.score - a.score;
      })
      .slice(0, 6)
      .map((x) => x.campaign);
  }, [campaigns, donationsByCampaign]);

  // Filtered campaigns based on applied search
  const filteredCampaigns = useMemo(() => {
    return (campaigns || []).filter((c) => {
      if (!c) return false;
      const title = (c.title || "").toLowerCase();
      const desc = (c.description || "").toLowerCase();
      const searchKey = (appliedQuery || "").toLowerCase();
      if (searchKey) {
        if (!title.includes(searchKey) && !desc.includes(searchKey)) return false;
      }
      return true;
    });
  }, [campaigns, appliedQuery]);

  return (
    <div className="explore-page">
      <div className="explore-hero">
        <div className="hero-content">
          <h1>Explore Campaigns</h1>
          <p>Support meaningful causes and track campaign progress.</p>
        </div>
      </div>

      <div className="explore-controls">
        <div className="search-row">
          <input
            aria-label="Search campaigns"
            placeholder="Search by title"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          />
          <button className="search-btn" onClick={handleSearch}>Search</button>
        </div>

        <div className="section-toggle">
          <button className={viewMode === "featured" ? "active" : undefined} onClick={() => setViewMode("featured")}>Featured</button>
          <button className={viewMode === "trending" ? "active" : undefined} onClick={() => setViewMode("trending")}>Trending</button>
          <button className={viewMode === "latest" ? "active" : undefined} onClick={() => setViewMode("latest")}>Latest</button>
          <button className={viewMode === "all" ? "active" : undefined} onClick={() => setViewMode("all")}>All</button>
        </div>
      </div>

      <div className="campaign-section">
        {loading ? (
          <div className="no-campaigns"><h3>Loading campaigns...</h3></div>
        ) : (campaigns || []).length === 0 ? (
          <div className="no-campaigns">
            <h3>No campaigns available</h3>
            <p>Campaigns will appear here once created.</p>
          </div>
        ) : (
          <>
            {appliedQuery ? (
              <section>
                <h2>Search Results</h2>
                {filteredCampaigns.length === 0 ? (
                  <div className="no-campaigns"><h3>No campaigns match your search</h3></div>
                ) : (
                  <div className="card-grid">
                    {filteredCampaigns.map((campaign) => (
                      <CampaignCard
                        key={campaign._id || campaign.id}
                        campaign={campaign}
                        user={user}
                        onDonate={(campaignId) => navigate(`/payment/${campaignId}`)}
                        onLogin={() => navigate("/auth")}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <>
                {viewMode === "featured" && (
                  <section className="featured">
                    <h2>Featured Campaigns — Top 3</h2>
                    {featured.length === 0 ? (
                      <div className="no-campaigns"><h3>No featured campaigns</h3></div>
                    ) : (
                      <div className="featured-row">
                        {featured.map((c) => (
                          <CampaignCard
                            key={c._id || c.id}
                            campaign={c}
                            user={user}
                            onDonate={(campaignId) => navigate(`/payment/${campaignId}`)}
                            onLogin={() => navigate("/auth")}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {viewMode === "trending" && (
                  <section className="trending">
                    <h2>Trending Now</h2>
                    {trending.length === 0 ? (
                      <div className="no-campaigns"><h3>No trending campaigns</h3></div>
                    ) : (
                      <div className="card-grid">
                        {trending.map((c) => (
                          <CampaignCard
                            key={c._id || c.id}
                            campaign={c}
                            user={user}
                            onDonate={(campaignId) => navigate(`/payment/${campaignId}`)}
                            onLogin={() => navigate("/auth")}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {viewMode === "latest" && (
                  <section className="latest">
                    <h2>Latest Campaigns</h2>
                    {latest.length === 0 ? (
                      <div className="no-campaigns"><h3>No recent campaigns</h3></div>
                    ) : (
                      <div className="card-grid">
                        {latest.map((c) => (
                          <CampaignCard
                            key={c._id || c.id}
                            campaign={c}
                            user={user}
                            onDonate={(campaignId) => navigate(`/payment/${campaignId}`)}
                            onLogin={() => navigate("/auth")}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {viewMode === "all" && (
                  <section>
                    <h2>All Campaigns</h2>
                    {filteredCampaigns.length === 0 ? (
                      <div className="no-campaigns">
                        <h3>No campaigns match your filters</h3>
                      </div>
                    ) : (
                      <div className="card-grid">
                        {filteredCampaigns.map((campaign) => (
                          <CampaignCard
                            key={campaign._id || campaign.id}
                            campaign={campaign}
                            user={user}
                            onDonate={(campaignId) => navigate(`/payment/${campaignId}`)}
                            onLogin={() => navigate("/auth")}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Explore;

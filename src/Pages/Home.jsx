import { useState } from "react";
import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
  const [active, setActive] = useState("explore");

  return (
    <div className="home-container">
      <section className="hero">
        <div className="hero-content">
          <h1>Empower Ideas. Fund Innovation.</h1>

          <p>
            Join thousands of backers supporting meaningful projects.
            Launch your campaign or support one today.
          </p>

          <div className="hero-buttons">
            <Link
              to="/explore"
              className={`btn ${active === "explore" ? "active" : ""}`}
              onClick={() => setActive("explore")}
            >
              Explore Campaigns
            </Link>

            <Link
              to="/dashboard"
              className={`btn ${active === "start" ? "active" : ""}`}
              onClick={() => setActive("start")}
            >
              Start a Campaign
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;

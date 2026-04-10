
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Home.css";
import img1 from "../assets/image.png";
import img2 from "../assets/image2.png";
import img3 from "../assets/image3.png";
import img4 from "../assets/image4.png";

function Home() {
  const [active, setActive] = useState("explore");
  const slides = [img1, img2, img3, img4];
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // auto-advance every 5s
    const next = () => setIndex((i) => (i + 1) % slides.length);
    timeoutRef.current = setInterval(next, 5000);
    return () => clearInterval(timeoutRef.current);
  }, []);

  function goPrev() {
    clearInterval(timeoutRef.current);
    setIndex((i) => (i - 1 + slides.length) % slides.length);
    timeoutRef.current = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
  }

  function goNext() {
    clearInterval(timeoutRef.current);
    setIndex((i) => (i + 1) % slides.length);
    timeoutRef.current = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5000);
  }

  return (
    <div className="home-container">
      <section className="hero">
        <div className="hero-slides" aria-hidden="true">
          {slides.map((src, i) => (
            <div
              key={i}
              className={`hero-slide ${i === index ? "active" : ""}`}
              style={{ backgroundImage: `url(${src})` }}
            />
          ))}
        </div>
        <button className="hero-arrow hero-arrow--left" onClick={goPrev} aria-label="Previous background">
          ‹
        </button>
        <button className="hero-arrow hero-arrow--right" onClick={goNext} aria-label="Next background">
          ›
        </button>

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
      <div className="hero-wave" aria-hidden="true">
        <svg viewBox="0 0 1200 80" preserveAspectRatio="none">
          <path d="M0,30 C150,80 350,0 600,30 C850,60 1050,10 1200,40 L1200,80 L0,80 Z" />
        </svg>
      </div>

      <section className="features">
        <div className="features-inner">
          <div className="feature-card">
            <h3>Discover Top Campaigns</h3>
            <p>Explore featured, trending, and latest campaigns chosen by our community.</p>
            <Link to="/explore" className="card-btn">Explore</Link>
          </div>

          <div className="feature-card">
            <h3>Start Your Campaign</h3>
            <p>Have an idea? Launch a campaign and reach backers who care about your mission.</p>
            <Link to="/dashboard" className="card-btn">Get Started</Link>
          </div>

          <div className="feature-card">
            <h3>Support Causes</h3>
            <p>Donate securely to causes you believe in and track their progress transparently.</p>
            <Link to="/explore" className="card-btn">Donate</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;

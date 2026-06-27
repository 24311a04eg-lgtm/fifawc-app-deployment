import { useState, useEffect } from "react";
import Matches from "./components/Matches";
import Standings from "./components/Standings";
import Scorers from "./components/Scorers";
import "./index.css";

export default function App() {
  const [activeTab, setActiveTab] = useState("matches");

  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">
          <span>🏆</span>
          <div className="brand-text">
            <div className="brand-title">FIFA World Cup</div>
            <div className="brand-sub">USA · Canada · Mexico 2026</div>
          </div>
        </div>
        <div className="nav-tabs">
          <button className={`nav-tab ${activeTab === "matches" ? "active" : ""}`} onClick={() => setActiveTab("matches")}>
            ⚽ Matches
          </button>
          <button className={`nav-tab ${activeTab === "standings" ? "active" : ""}`} onClick={() => setActiveTab("standings")}>
            📊 Standings
          </button>
          <button className={`nav-tab ${activeTab === "scorers" ? "active" : ""}`} onClick={() => setActiveTab("scorers")}>
            🥅 Top Scorers
          </button>
        </div>
      </nav>

      <div className="hero-banner">
        <div className="hero-left">
          <h1>WORLD CUP <span>2026</span></h1>
          <p>USA · Canada · Mexico · June 11 – July 19</p>
        </div>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-value">48</div>
            <div className="hero-stat-label">Teams</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">104</div>
            <div className="hero-stat-label">Matches</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">16</div>
            <div className="hero-stat-label">Venues</div>
          </div>
        </div>
      </div>

      <div className="container">
        {activeTab === "matches" && <Matches />}
        {activeTab === "standings" && <Standings />}
        {activeTab === "scorers" && <Scorers />}
      </div>
    </div>
  );
}
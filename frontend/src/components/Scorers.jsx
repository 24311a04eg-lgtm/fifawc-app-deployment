import { useState, useEffect } from "react";
import axios from "axios";

export default function Scorers() {
  const [scorers, setScorers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchScorers();
  }, []);

  async function fetchScorers() {
    try {
      const res = await axios.get("/api/scorers");
      setScorers(res.data);
    } catch (err) {
      setError("Failed to load scorers");
    } finally {
      setLoading(false);
    }
  }

  const medals = ["🥇", "🥈", "🥉"];

  if (loading) return <div className="loading">🥅 Loading scorers...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      <h2 className="page-title">Top Scorers</h2>
      <div className="scorers-list">
        {scorers.map((scorer, idx) => (
          <div key={scorer.id} className="scorer-card">
            <div className={`scorer-rank ${idx < 3 ? "top" : ""}`}>
              {idx < 3 ? medals[idx] : `#${idx + 1}`}
            </div>
            <div className="scorer-info">
              <div className="scorer-name">{scorer.player_name}</div>
              <div className="scorer-team">
                {scorer.team_crest && (
                  <img
                    src={scorer.team_crest}
                    alt={scorer.team_name}
                    className="team-crest-sm"
                  />
                )}
                {scorer.team_name}
              </div>
            </div>
            <div className="scorer-stats">
              <div className="stat-badge">
                <span className="stat-value">{scorer.goals}</span>
                <span className="stat-label">Goals</span>
              </div>
              <div className="stat-badge">
                <span className="stat-value">{scorer.assists}</span>
                <span className="stat-label">Assists</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

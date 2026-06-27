import { useState, useEffect } from "react";
import axios from "axios";

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchMatches() {
    try {
      const res = await axios.get("/api/matches");
      setMatches(res.data);
      setError(null);
    } catch (err) {
      setError("Failed to load matches");
    } finally {
      setLoading(false);
    }
  }

  const filters = ["ALL", "FINISHED", "IN_PLAY", "TIMED", "SCHEDULED"];

  const filtered =
    filter === "ALL"
      ? matches
      : matches.filter((m) => m.status === filter);

  if (loading) {
    return <div className="loading">⚽ Loading matches...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      <h2 className="page-title">World Cup Matches</h2>

      <div className="filter-tabs">
        {filters.map((f) => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? "active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "ALL" && "All"}
            {f === "FINISHED" && "✅ Finished"}
            {f === "IN_PLAY" && "🔴 Live"}
            {f === "TIMED" && "📅 Upcoming"}
            {f === "SCHEDULED" && "🕐 Scheduled"}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="loading">No matches found</div>
      ) : (
        <div className="matches-grid">
          {filtered.map((match) => (
            <div
              key={match.id}
              className={`match-card ${
                match.status === "IN_PLAY" || match.status === "PAUSED"
                  ? "live"
                  : ""
              }`}
            >
              <div className="match-stage">
                {match.stage?.replace(/_/g, " ")} · Matchday {match.matchday}
              </div>

              <div className="match-teams">
                <div className="team">
                  {match.home_crest && (
                    <img
                      src={match.home_crest}
                      alt={match.home_team}
                      className="team-crest"
                    />
                  )}
                  <span className="team-name">{match.home_team}</span>
                </div>

                <div className="score-block">
                  <div className="score">
                    <span>{match.home_score ?? "-"}</span>
                    <span className="score-divider">:</span>
                    <span>{match.away_score ?? "-"}</span>
                  </div>

                  <span
                    className={`match-status status-${match.status}`}
                  >
                    {match.status === "FINISHED" && "FT"}
                    {match.status === "IN_PLAY" && "● LIVE"}
                    {match.status === "PAUSED" && "HT"}
                    {match.status === "TIMED" && "UPCOMING"}
                    {match.status === "SCHEDULED" && "SCHEDULED"}
                  </span>
                </div>

                <div className="team">
                  {match.away_crest && (
                    <img
                      src={match.away_crest}
                      alt={match.away_team}
                      className="team-crest"
                    />
                  )}
                  <span className="team-name">{match.away_team}</span>
                </div>
              </div>

              <div className="match-date">
                {new Date(match.match_date).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
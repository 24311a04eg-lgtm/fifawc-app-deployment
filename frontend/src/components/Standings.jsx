import { useState, useEffect } from "react";
import axios from "axios";

export default function Standings() {
  const [standings, setStandings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStandings();
  }, []);

  async function fetchStandings() {
    try {
      const res = await axios.get("/api/standings");
      const grouped = res.data.reduce((acc, row) => {
        const group = row.group_name || 'STAGE';
        if (!acc[group]) acc[group] = [];
        acc[group].push(row);
        return acc;
      }, {});
      setStandings(grouped);
    } catch (err) {
      setError("Failed to load standings");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">📊 Loading standings...</div>;
  if (error) return <div className="error">{error}</div>;

  const groupEntries = Object.entries(standings).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div>
      <h2 className="page-title">Group Standings</h2>
      <div className="groups-grid">
        {groupEntries.map(([group, teams]) => (
          <div key={group} className="group-card">
            <div className="group-header">{group.replace(/_/g, " ")}</div>
            <table className="standings-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Team</th>
                  <th>P</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GD</th>
                  <th>Pts</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, idx) => (
                  <tr key={team.id} className={idx < 2 ? "qualify" : ""}>
                    <td>{team.position}</td>
                    <td>
                      <div className="team-cell">
                        {team.team_crest && (
                          <img
                            src={team.team_crest}
                            alt={team.team_name}
                            className="team-crest-sm"
                          />
                        )}
                        {team.team_name}
                      </div>
                    </td>
                    <td>{team.played}</td>
                    <td>{team.won}</td>
                    <td>{team.draw}</td>
                    <td>{team.lost}</td>
                    <td>{team.goal_diff > 0 ? `+${team.goal_diff}` : team.goal_diff}</td>
                    <td className="points-cell">{team.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

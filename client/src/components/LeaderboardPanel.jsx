import { motion } from "framer-motion";

function LeaderboardPanel({ leaderboard = [] }) {
  return (
    <motion.section
      className="admin-panel leaderboard-panel"
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
    >
      <div className="admin-panel-head">
        <div>
          <span className="admin-eyebrow">Recognition</span>
          <h3>Volunteer Leaderboard</h3>
        </div>
      </div>

      <div className="leaderboard-list">
        {leaderboard.length ? (
          leaderboard.map((volunteer) => (
            <div key={volunteer.id} className="leaderboard-card glass-panel">
              <div className="leaderboard-rank">#{volunteer.rank}</div>
              <div className="leaderboard-content">
                <strong>{volunteer.name}</strong>
                <p>
                  {volunteer.points} pts · {volunteer.tasksCompleted} tasks
                </p>
                <div className="leaderboard-badges">
                  {(volunteer.badges || []).length ? (
                    volunteer.badges.map((badge) => (
                      <span key={`${volunteer.id}-${badge}`} className="leaderboard-badge">
                        {badge}
                      </span>
                    ))
                  ) : (
                    <span className="leaderboard-badge muted">Rising helper</span>
                  )}
                </div>
              </div>
              <div className="leaderboard-score">{volunteer.performanceScore}%</div>
            </div>
          ))
        ) : (
          <p className="admin-empty-copy">No volunteer leaderboard data yet.</p>
        )}
      </div>
    </motion.section>
  );
}

export default LeaderboardPanel;

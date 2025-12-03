// Quick script to check vote streak for a user
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "nexus.db");
const db = new sqlite3.Database(dbPath);

const userId = "1392165977793368124";

console.log("🔍 Checking vote streak for user:", userId);
console.log("");

db.get(
  "SELECT * FROM vote_streaks WHERE user_id = ?",
  [userId],
  (err, row) => {
    if (err) {
      console.error("Error:", err);
      process.exit(1);
    }

    if (!row) {
      console.log("❌ No vote streak data found for this user");
      process.exit(0);
    }

    console.log("📊 Vote Streak Data:");
    console.log("  Current Streak:", row.current_streak, "days");
    console.log("  Longest Streak:", row.longest_streak, "days");
    console.log("  Total Votes:", row.total_votes);
    console.log("  Last Vote:", new Date(row.last_vote_at).toLocaleString());
    console.log("  Streak Started:", new Date(row.streak_started).toLocaleString());
    console.log("");

    // Show all votes
    db.all(
      "SELECT * FROM vote_rewards WHERE user_id = ? ORDER BY voted_at DESC LIMIT 10",
      [userId],
      (err, votes) => {
        if (err) {
          console.error("Error fetching votes:", err);
        } else {
          console.log(`📜 Last ${votes.length} votes:`);
          votes.forEach((vote, i) => {
            console.log(
              `  ${i + 1}. ${vote.botlist} - ${new Date(vote.voted_at).toLocaleString()}`
            );
          });
        }
        db.close();
        process.exit(0);
      }
    );
  }
);


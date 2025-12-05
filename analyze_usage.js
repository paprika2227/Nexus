// OWNER-ONLY SCRIPT - Analyze bot usage patterns
// Run: node analyze_usage.js

const UsageAnalyzer = require("./utils/usageAnalyzer");
const chalk = require("chalk");

(async () => {
  const analysis = await UsageAnalyzer.analyzeUsagePatterns(7);

  console.log(chalk.bold.cyan("\n🔍 NEXUS USAGE ANALYSIS (OWNER ONLY)\n"));

  console.log(
    chalk.bold(
      `📊 Total Commands (7 days): ${chalk.green(analysis.totalStats.total_commands)}`
    )
  );
  console.log(
    chalk.bold(
      `📈 Average per day: ${chalk.cyan(analysis.avgCommandsPerDay)}\n`
    )
  );

  console.log(chalk.bold("⏰ HOURLY USAGE BREAKDOWN:\n"));

  const maxCommands = Math.max(...analysis.hourlyData.map((r) => r.commands));

  analysis.hourlyData.forEach((row) => {
    const hour = parseInt(row.hour);
    const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
    const barLength = Math.floor((row.commands / maxCommands) * 40);
    const bar = "█".repeat(barLength);

    let coloredBar;
    if (row.commands > maxCommands * 0.7) {
      coloredBar = chalk.red(bar);
    } else if (row.commands > maxCommands * 0.4) {
      coloredBar = chalk.yellow(bar);
    } else {
      coloredBar = chalk.green(bar);
    }

    console.log(
      `${hourLabel} | ${coloredBar} ${chalk.white(row.commands)} (${row.servers} servers)`
    );
  });

  console.log();
  console.log(chalk.bold.red("🔴 PEAK HOURS (Avoid maintenance):\n"));
  analysis.peakHours.forEach((p, i) => {
    console.log(
      `${i + 1}. ${p.hour}:00 - ${chalk.red(p.commands + " commands")}`
    );
  });

  console.log();
  console.log(chalk.bold.green("🟢 QUIET HOURS (Best for maintenance):\n"));
  analysis.quietHours.forEach((q, i) => {
    console.log(
      `${i + 1}. ${q.hour}:00 - ${chalk.green(q.commands + " commands")}`
    );
  });

  console.log();
  console.log(chalk.bold("📅 USAGE BY DAY:\n"));
  analysis.dailyData.forEach((d) => {
    console.log(`${d.day.padEnd(10)} - ${chalk.cyan(d.commands + " commands")}`);
  });

  console.log();
  console.log(chalk.bold.cyan("💡 MAINTENANCE WINDOW:\n"));
  console.log(
    chalk.green(
      `✅ Recommended: ${analysis.maintenanceWindow.start} - ${analysis.maintenanceWindow.end}`
    )
  );
  console.log(chalk.gray(`   ${analysis.maintenanceWindow.reason}`));

  console.log(
    chalk.yellow(
      `\n⚠️  Busiest day: ${analysis.busiestDay.day} (${analysis.busiestDay.commands} commands)`
    )
  );

  console.log();
})().catch((err) => {
  console.error(chalk.red("Error analyzing usage:"), err);
  process.exit(1);
});


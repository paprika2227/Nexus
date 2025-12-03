// Command performance monitoring
const logger = require("./logger");

class PerformanceMonitor {
  constructor() {
    this.commandStats = new Map();
    this.errorCounts = new Map();
  }

  /**
   * Start timing a command
   */
  start(commandName) {
    return {
      commandName,
      startTime: Date.now(),
      startMemory: process.memoryUsage().heapUsed,
    };
  }

  /**
   * End timing and record stats
   */
  end(timer, success = true, error = null) {
    const duration = Date.now() - timer.startTime;
    const memoryUsed = process.memoryUsage().heapUsed - timer.startMemory;

    // Get or create command stats
    if (!this.commandStats.has(timer.commandName)) {
      this.commandStats.set(timer.commandName, {
        executions: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: 0,
        successRate: 100,
      });
    }

    const stats = this.commandStats.get(timer.commandName);
    stats.executions++;
    stats.totalDuration += duration;
    stats.avgDuration = Math.round(stats.totalDuration / stats.executions);
    stats.minDuration = Math.min(stats.minDuration, duration);
    stats.maxDuration = Math.max(stats.maxDuration, duration);

    if (!success) {
      stats.errors++;
      stats.successRate = (
        ((stats.executions - stats.errors) / stats.executions) *
        100
      ).toFixed(2);

      // Track error types
      if (error) {
        const errorKey = `${timer.commandName}:${error.code || error.message}`;
        this.errorCounts.set(
          errorKey,
          (this.errorCounts.get(errorKey) || 0) + 1
        );
      }
    } else {
      stats.successRate = (
        ((stats.executions - stats.errors) / stats.executions) *
        100
      ).toFixed(2);
    }

    // Log slow commands (>5 seconds)
    if (duration > 5000) {
      logger.warn(
        `[Performance] Slow command detected: ${timer.commandName} took ${duration}ms`
      );
    }

    return { duration, memoryUsed };
  }

  /**
   * Get stats for a specific command
   */
  getCommandStats(commandName) {
    return this.commandStats.get(commandName) || null;
  }

  /**
   * Get all command stats sorted by executions
   */
  getAllStats() {
    return Array.from(this.commandStats.entries())
      .map(([name, stats]) => ({ command: name, ...stats }))
      .sort((a, b) => b.executions - a.executions);
  }

  /**
   * Get slowest commands
   */
  getSlowestCommands(limit = 10) {
    return Array.from(this.commandStats.entries())
      .map(([name, stats]) => ({ command: name, ...stats }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Get most error-prone commands
   */
  getMostErrors(limit = 10) {
    return Array.from(this.commandStats.entries())
      .map(([name, stats]) => ({ command: name, ...stats }))
      .filter((s) => s.errors > 0)
      .sort((a, b) => b.errors - a.errors)
      .slice(0, limit);
  }

  /**
   * Get common errors
   */
  getCommonErrors(limit = 10) {
    return Array.from(this.errorCounts.entries())
      .map(([key, count]) => ({ error: key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  /**
   * Get overall performance summary
   */
  getSummary() {
    const allStats = this.getAllStats();
    const totalExecutions = allStats.reduce((sum, s) => sum + s.executions, 0);
    const totalErrors = allStats.reduce((sum, s) => sum + s.errors, 0);
    const avgDuration =
      allStats.reduce((sum, s) => sum + s.avgDuration, 0) /
      (allStats.length || 1);

    return {
      totalCommands: allStats.length,
      totalExecutions,
      totalErrors,
      overallSuccessRate:
        (
          ((totalExecutions - totalErrors) / (totalExecutions || 1)) *
          100
        ).toFixed(2) + "%",
      avgCommandDuration: Math.round(avgDuration) + "ms",
      slowestCommand:
        allStats.sort((a, b) => b.avgDuration - a.avgDuration)[0]?.command ||
        "N/A",
      mostUsedCommand: allStats[0]?.command || "N/A",
    };
  }

  /**
   * Reset all stats
   */
  reset() {
    this.commandStats.clear();
    this.errorCounts.clear();
    logger.info("[Performance Monitor] Stats reset");
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;

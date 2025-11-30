const db = require("./database");

class ThreatIntelligence {
  static async reportThreat(
    userId,
    threatType,
    threatData,
    severity,
    sourceGuildId
  ) {
    // Check if threat already exists
    const existing = await db.getThreatIntelligence(userId);
    const similarThreat = existing.find(
      (t) =>
        t.threat_type === threatType && Date.now() - t.reported_at < 86400000 // Within 24 hours
    );

    if (similarThreat) {
      // Verify existing threat
      await db.verifyThreat(similarThreat.id);
      return { id: similarThreat.id, verified: true };
    }

    // Create new threat report
    const threatId = await db.reportThreat(
      userId,
      threatType,
      threatData,
      severity,
      sourceGuildId
    );
    return { id: threatId, verified: false };
  }

  static async checkThreat(userId) {
    const threats = await db.getThreatIntelligence(userId);

    if (threats.length === 0) {
      return { hasThreat: false, riskScore: 0 };
    }

    // Calculate risk score
    let riskScore = 0;
    const verifiedThreats = threats.filter((t) => t.verified);

    verifiedThreats.forEach((threat) => {
      if (threat.severity === "critical") riskScore += 40;
      else if (threat.severity === "high") riskScore += 30;
      else if (threat.severity === "medium") riskScore += 20;
      else riskScore += 10;
    });

    // Recent threats weigh more
    const recentThreats = threats.filter(
      (t) => Date.now() - t.reported_at < 604800000
    ); // Last week
    riskScore += recentThreats.length * 5;

    riskScore = Math.min(100, riskScore);

    return {
      hasThreat: riskScore >= 30,
      riskScore,
      threatCount: threats.length,
      verifiedCount: verifiedThreats.length,
      recentCount: recentThreats.length,
      threats: threats.slice(0, 5), // Most recent 5
    };
  }

  static async getThreatSummary(userId) {
    const threats = await db.getThreatIntelligence(userId);

    const summary = {
      total: threats.length,
      byType: {},
      bySeverity: {},
      verified: threats.filter((t) => t.verified).length,
      recent: threats.filter((t) => Date.now() - t.reported_at < 604800000)
        .length,
    };

    threats.forEach((threat) => {
      summary.byType[threat.threat_type] =
        (summary.byType[threat.threat_type] || 0) + 1;
      summary.bySeverity[threat.severity] =
        (summary.bySeverity[threat.severity] || 0) + 1;
    });

    return summary;
  }
}

module.exports = ThreatIntelligence;

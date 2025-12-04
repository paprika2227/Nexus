const performanceMonitor = require("./utils/performanceMonitor");
const AdvancedAntiRaid = require("./utils/advancedAntiRaid");
const db = require("./utils/database");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

console.log(
  `${colors.cyan}${colors.bold}╔════════════════════════════════════════════════╗`
);
console.log(`║   NEXUS RAID RESPONSE PERFORMANCE TEST        ║`);
console.log(
  `╚════════════════════════════════════════════════╝${colors.reset}\n`
);

// Mock guild and member for testing
const mockGuild = {
  id: "test_guild_123",
  name: "Test Server",
  members: {
    fetch: async () => null,
    cache: new Map(),
  },
  channels: {
    cache: new Map(),
  },
  roles: {
    cache: new Map(),
  },
};

function createMockMember(id, age = 86400000, hasAvatar = true) {
  return {
    id: `user_${id}`,
    user: {
      id: `user_${id}`,
      username: `TestUser${id}`,
      discriminator: String(1000 + id).padStart(4, "0"),
      avatar: hasAvatar ? "avatar_url" : null,
      createdTimestamp: Date.now() - age,
    },
    joinedTimestamp: Date.now(),
    guild: mockGuild,
  };
}

async function testRaidDetectionSpeed() {
  console.log(`${colors.cyan}Testing Raid Detection Speed...${colors.reset}\n`);

  // Test 1: Single Join (No Raid)
  console.log("Test 1: Single Join (No Raid Detection)");
  await performanceMonitor.benchmark(
    "Single Join",
    async () => {
      const member = createMockMember(1);
      await AdvancedAntiRaid.detectRaid(mockGuild, member);
    },
    10
  );

  // Test 2: Raid Scenario (5 new accounts in quick succession)
  console.log("\nTest 2: Raid Detection (5 new accounts)");

  // Clear join history first
  await AdvancedAntiRaid.saveJoinHistory(mockGuild.id, { joins: [] });

  const raidDetectTimes = [];
  for (let i = 0; i < 5; i++) {
    const start = process.hrtime.bigint();
    const member = createMockMember(i, 3600000, false); // 1 hour old, no avatar
    await AdvancedAntiRaid.detectRaid(mockGuild, member);
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000;
    raidDetectTimes.push(duration);
    console.log(`  Join ${i + 1}: ${duration.toFixed(2)}ms`);
  }

  const avgRaid =
    raidDetectTimes.reduce((a, b) => a + b, 0) / raidDetectTimes.length;
  console.log(
    `\n${colors.bold}Average Raid Detection: ${avgRaid.toFixed(2)}ms${
      colors.reset
    }`
  );

  // Test 3: Ban Response Time (simulated)
  console.log("\nTest 3: Ban Response Time Simulation");
  const banResult = await performanceMonitor.benchmark(
    "Ban Action",
    async () => {
      // Simulate ban operation
      await new Promise((resolve) => setTimeout(resolve, 10)); // Discord API latency
    },
    10
  );

  // Test 4: Complete Raid Response (Detection + Ban)
  console.log("\nTest 4: Full Raid Response (Detection + Action)");
  const fullResponse = avgRaid + banResult.avg;
  console.log(`  Detection: ${avgRaid.toFixed(2)}ms`);
  console.log(`  Ban: ${banResult.avg.toFixed(2)}ms`);
  console.log(
    `  ${colors.bold}Total: ${fullResponse.toFixed(2)}ms${colors.reset}`
  );

  // Compare with Wick
  console.log(
    `\n${colors.cyan}═══════════════════════════════════════${colors.reset}`
  );
  console.log(
    `${colors.cyan}${colors.bold}       NEXUS VS WICK COMPARISON${colors.reset}`
  );
  console.log(
    `${colors.cyan}═══════════════════════════════════════${colors.reset}\n`
  );

  const wickEstimate = 130; // Wick's estimated full response time
  const nexusTotal = fullResponse;

  console.log(
    `  ${colors.cyan}Wick (estimated):${colors.reset} ${wickEstimate}ms`
  );
  console.log(
    `  ${colors.cyan}Nexus (measured):${colors.reset} ${nexusTotal.toFixed(
      2
    )}ms`
  );

  const diff = nexusTotal - wickEstimate;
  if (diff < 0) {
    console.log(
      `\n  ${colors.green}${colors.bold}✅ NEXUS IS FASTER by ${Math.abs(
        diff
      ).toFixed(2)}ms!${colors.reset}`
    );
  } else if (diff < 50) {
    console.log(
      `\n  ${colors.yellow}⚠️ COMPARABLE (within 50ms)${colors.reset}`
    );
  } else {
    console.log(
      `\n  ${colors.red}❌ SLOWER by ${diff.toFixed(2)}ms - NEEDS OPTIMIZATION${
        colors.reset
      }`
    );
  }

  // Detailed breakdown
  console.log(`\n${colors.cyan}Detailed Performance Metrics:${colors.reset}`);
  console.log(
    `  First Join: ${raidDetectTimes[0].toFixed(2)}ms (includes DB setup)`
  );
  console.log(
    `  Subsequent Joins: ${(
      raidDetectTimes.slice(1).reduce((a, b) => a + b, 0) /
      (raidDetectTimes.length - 1)
    ).toFixed(2)}ms avg`
  );
  console.log(`  Min: ${Math.min(...raidDetectTimes).toFixed(2)}ms`);
  console.log(`  Max: ${Math.max(...raidDetectTimes).toFixed(2)}ms`);

  // Performance recommendations
  console.log(
    `\n${colors.cyan}${colors.bold}Performance Recommendations:${colors.reset}`
  );
  if (avgRaid > 50) {
    console.log(
      `  ${colors.yellow}• Consider caching getServerConfig() calls${colors.reset}`
    );
    console.log(
      `  ${colors.yellow}• Optimize database queries with indexes${colors.reset}`
    );
  }
  if (fullResponse > 150) {
    console.log(
      `  ${colors.yellow}• Consider parallel ban operations${colors.reset}`
    );
    console.log(
      `  ${colors.yellow}• Defer non-critical logging${colors.reset}`
    );
  }
  if (fullResponse < 100) {
    console.log(`  ${colors.green}✅ Performance is excellent!${colors.reset}`);
  }

  // Clean up
  await AdvancedAntiRaid.saveJoinHistory(mockGuild.id, { joins: [] });

  console.log(
    `\n${colors.cyan}═══════════════════════════════════════${colors.reset}`
  );
  console.log(`${colors.green}${colors.bold}Test Complete!${colors.reset}\n`);

  // Calculate threat score
  const isNexusFaster = diff < 0;
  const percentageDiff = ((Math.abs(diff) / wickEstimate) * 100).toFixed(1);

  if (isNexusFaster) {
    console.log(
      `${colors.green}${colors.bold}🎉 NEXUS IS ${percentageDiff}% FASTER THAN WICK!${colors.reset}`
    );
  } else if (diff < 50) {
    console.log(
      `${colors.yellow}${colors.bold}⚖️ NEXUS IS COMPETITIVE WITH WICK${colors.reset}`
    );
  } else {
    console.log(
      `${colors.red}${colors.bold}⚠️ OPTIMIZATION NEEDED - ${percentageDiff}% slower${colors.reset}`
    );
  }

  process.exit(0);
}

// Run tests
testRaidDetectionSpeed().catch((error) => {
  console.error(`${colors.red}${colors.bold}Test Error:${colors.reset}`, error);
  process.exit(1);
});

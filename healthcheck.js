/**
 * Health Check Script
 * Run this before deploying to catch issues
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}╔═══════════════════════════════════════╗`);
console.log(`║   NEXUS PRE-DEPLOYMENT HEALTH CHECK   ║`);
console.log(`╚═══════════════════════════════════════╝${colors.reset}\n`);

let passed = 0;
let failed = 0;
const issues = [];

// Check 1: .env file exists
console.log('Checking .env file...');
if (fs.existsSync('.env')) {
  console.log(`${colors.green}✓ .env file exists${colors.reset}`);
  passed++;
  
  // Check required vars
  const env = fs.readFileSync('.env', 'utf8');
  const required = ['DISCORD_TOKEN', 'OWNER_ID', 'CLIENT_ID'];
  
  required.forEach(key => {
    if (env.includes(key)) {
      console.log(`${colors.green}  ✓ ${key} found${colors.reset}`);
    } else {
      console.log(`${colors.red}  ✗ ${key} missing${colors.reset}`);
      issues.push(`Missing ${key} in .env`);
      failed++;
    }
  });
} else {
  console.log(`${colors.red}✗ .env file missing${colors.reset}`);
  issues.push('Create .env file with your tokens');
  failed++;
}

// Check 2: Data directory
console.log('\nChecking data directory...');
if (!fs.existsSync('data')) {
  fs.mkdirSync('data');
  console.log(`${colors.yellow}⚠ Created data/ directory${colors.reset}`);
} else {
  console.log(`${colors.green}✓ data/ directory exists${colors.reset}`);
  passed++;
}

// Check 3: Commands load
console.log('\nChecking commands...');
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
let commandErrors = 0;

commandFiles.forEach(file => {
  try {
    delete require.cache[require.resolve(`./commands/${file}`)];
    const command = require(`./commands/${file}`);
    if (!command.data || !command.execute) {
      console.log(`${colors.yellow}⚠ ${file}: Missing data or execute${colors.reset}`);
      commandErrors++;
    }
  } catch (error) {
    console.log(`${colors.red}✗ ${file}: ${error.message}${colors.reset}`);
    issues.push(`Command ${file} has errors`);
    commandErrors++;
  }
});

if (commandErrors === 0) {
  console.log(`${colors.green}✓ All ${commandFiles.length} commands load correctly${colors.reset}`);
  passed++;
} else {
  console.log(`${colors.red}✗ ${commandErrors} commands have issues${colors.reset}`);
  failed++;
}

// Check 4: Events load
console.log('\nChecking events...');
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
let eventErrors = 0;

eventFiles.forEach(file => {
  try {
    delete require.cache[require.resolve(`./events/${file}`)];
    const event = require(`./events/${file}`);
    if (!event.name || !event.execute) {
      console.log(`${colors.yellow}⚠ ${file}: Missing name or execute${colors.reset}`);
      eventErrors++;
    }
  } catch (error) {
    console.log(`${colors.red}✗ ${file}: ${error.message}${colors.reset}`);
    issues.push(`Event ${file} has errors`);
    eventErrors++;
  }
});

if (eventErrors === 0) {
  console.log(`${colors.green}✓ All ${eventFiles.length} events load correctly${colors.reset}`);
  passed++;
} else {
  console.log(`${colors.red}✗ ${eventErrors} events have issues${colors.reset}`);
  failed++;
}

// Check 5: Dependencies
console.log('\nChecking dependencies...');
const package = require('./package.json');
const deps = Object.keys(package.dependencies);
let missingDeps = 0;

deps.forEach(dep => {
  try {
    require.resolve(dep);
  } catch (error) {
    console.log(`${colors.red}✗ ${dep} not installed${colors.reset}`);
    issues.push(`Run: npm install ${dep}`);
    missingDeps++;
  }
});

if (missingDeps === 0) {
  console.log(`${colors.green}✓ All ${deps.length} dependencies installed${colors.reset}`);
  passed++;
} else {
  console.log(`${colors.red}✗ ${missingDeps} dependencies missing${colors.reset}`);
  issues.push('Run: npm install');
  failed++;
}

// Check 6: Database utils
console.log('\nChecking database...');
try {
  const db = require('./utils/database');
  if (db && db.db) {
    console.log(`${colors.green}✓ Database module loads${colors.reset}`);
    passed++;
  } else {
    console.log(`${colors.red}✗ Database module issues${colors.reset}`);
    issues.push('Database not properly initialized');
    failed++;
  }
} catch (error) {
  console.log(`${colors.red}✗ Database error: ${error.message}${colors.reset}`);
  issues.push('Fix database.js');
  failed++;
}

// Check 7: Logger
console.log('\nChecking logger...');
try {
  const logger = require('./utils/logger');
  if (logger && typeof logger.info === 'function') {
    console.log(`${colors.green}✓ Logger module works${colors.reset}`);
    passed++;
  } else {
    console.log(`${colors.red}✗ Logger module issues${colors.reset}`);
    issues.push('Logger not properly configured');
    failed++;
  }
} catch (error) {
  console.log(`${colors.red}✗ Logger error: ${error.message}${colors.reset}`);
  issues.push('Fix logger.js');
  failed++;
}

// Summary
console.log(`\n${colors.cyan}═══════════════════════════════════════${colors.reset}`);
console.log(`${colors.cyan}          HEALTH CHECK RESULTS${colors.reset}`);
console.log(`${colors.cyan}═══════════════════════════════════════${colors.reset}\n`);

console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`);
console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}\n`);

if (issues.length > 0) {
  console.log(`${colors.red}Issues to fix:${colors.reset}`);
  issues.forEach(issue => console.log(`  • ${issue}`));
  console.log('');
}

if (failed === 0) {
  console.log(`${colors.green}${colors.reset}`);
  console.log(`🎉 ${colors.green}ALL CHECKS PASSED - READY TO DEPLOY!${colors.reset}\n`);
  process.exit(0);
} else {
  console.log(`${colors.red}⚠️ FIX ISSUES BEFORE DEPLOYING${colors.reset}\n`);
  process.exit(1);
}


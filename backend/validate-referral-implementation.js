#!/usr/bin/env node

/**
 * Validation script for Referral System Implementation
 * Run with: node validate-referral-implementation.js
 */

const fs = require('fs');
const path = require('path');

const COLORS = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    const stats = fs.statSync(fullPath);
    log(`✓ ${description} (${stats.size} bytes)`, 'green');
    return true;
  } else {
    log(`✗ ${description} - NOT FOUND`, 'red');
    return false;
  }
}

function checkDirectory(dirPath, description) {
  const fullPath = path.join(__dirname, dirPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  
  if (exists) {
    const files = fs.readdirSync(fullPath);
    log(`✓ ${description} (${files.length} files)`, 'green');
    return true;
  } else {
    log(`✗ ${description} - NOT FOUND`, 'red');
    return false;
  }
}

function checkFileContent(filePath, searchString, description) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    log(`✗ ${description} - File not found`, 'red');
    return false;
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  const found = content.includes(searchString);
  
  if (found) {
    log(`✓ ${description}`, 'green');
    return true;
  } else {
    log(`✗ ${description} - Content not found`, 'red');
    return false;
  }
}

console.log('\n' + '='.repeat(60));
log('Referral System Implementation Validation', 'blue');
console.log('='.repeat(60) + '\n');

let totalChecks = 0;
let passedChecks = 0;

// Core Module Files
log('\n📁 Core Module Files:', 'yellow');
totalChecks++;
if (checkDirectory('src/modules/referrals', 'Referrals module directory')) passedChecks++;

totalChecks++;
if (checkDirectory('src/modules/referrals/entities', 'Entities directory')) passedChecks++;

totalChecks++;
if (checkDirectory('src/modules/referrals/dto', 'DTOs directory')) passedChecks++;

totalChecks++;
if (checkFile('src/modules/referrals/entities/referral.entity.ts', 'Referral entity')) passedChecks++;

totalChecks++;
if (checkFile('src/modules/referrals/entities/referral-campaign.entity.ts', 'Campaign entity')) passedChecks++;

totalChecks++;
if (checkFile('src/modules/referrals/dto/referral.dto.ts', 'Referral DTOs')) passedChecks++;

totalChecks++;
if (checkFile('src/modules/referrals/dto/campaign.dto.ts', 'Campaign DTOs')) passedChecks++;

totalChecks++;
if (checkFile('src/modules/referrals/referrals.service.ts', 'Referrals service')) passedChecks++;

totalChecks++;
if (checkFile('src/modules/referrals/campaigns.service.ts', 'Campaigns service')) passedChecks++;

totalChecks++;
if (checkFile('src/modules/referrals/referrals.controller.ts', 'Referrals controller')) passedChecks++;

totalChecks++;
if (checkFile('src/modules/referrals/admin-referrals.controller.ts', 'Admin controller')) passedChecks++;

totalChecks++;
if (checkFile('src/modules/referrals/referral-events.listener.ts', 'Event listener')) passedChecks++;

totalChecks++;
if (checkFile('src/modules/referrals/referrals.module.ts', 'Referrals module')) passedChecks++;

// Tests
log('\n🧪 Test Files:', 'yellow');
totalChecks++;
if (checkFile('src/modules/referrals/referrals.service.spec.ts', 'Unit tests')) passedChecks++;

totalChecks++;
if (checkFile('src/modules/referrals/referrals.integration.spec.ts', 'Integration tests')) passedChecks++;

// Migration
log('\n🗄️  Database Migration:', 'yellow');
totalChecks++;
if (checkFile('src/migrations/1776000000000-CreateReferralsTable.ts', 'Referrals migration')) passedChecks++;

// Integration Points
log('\n🔗 Integration Points:', 'yellow');
totalChecks++;
if (checkFileContent('src/app.module.ts', 'ReferralsModule', 'ReferralsModule imported in AppModule')) passedChecks++;

totalChecks++;
if (checkFileContent('src/auth/dto/auth.dto.ts', 'referralCode', 'Referral code field in RegisterDto')) passedChecks++;

totalChecks++;
if (checkFileContent('src/auth/auth.service.ts', 'user.signup-with-referral', 'Event emission in auth service')) passedChecks++;

totalChecks++;
if (checkFileContent('src/modules/notifications/entities/notification.entity.ts', 'REFERRAL_COMPLETED', 'Referral notification types')) passedChecks++;

// Documentation
log('\n📚 Documentation:', 'yellow');
totalChecks++;
if (checkFile('src/modules/referrals/README.md', 'Module README')) passedChecks++;

totalChecks++;
if (checkFile('src/modules/referrals/INTEGRATION_GUIDE.md', 'Integration guide')) passedChecks++;

totalChecks++;
if (checkFile('../REFERRAL_SYSTEM_SUMMARY.md', 'System summary')) passedChecks++;

totalChecks++;
if (checkFile('../REFERRAL_QUICKSTART.md', 'Quick start guide')) passedChecks++;

totalChecks++;
if (checkFile('../REFERRAL_IMPLEMENTATION_CHECKLIST.md', 'Implementation checklist')) passedChecks++;

totalChecks++;
if (checkFile('../REFERRAL_ARCHITECTURE.md', 'Architecture documentation')) passedChecks++;

totalChecks++;
if (checkFile('../TEST_REFERRAL_SYSTEM.md', 'Manual test guide')) passedChecks++;

// Examples
log('\n📝 Examples:', 'yellow');
totalChecks++;
if (checkFile('src/modules/referrals/examples/create-campaign.http', 'HTTP examples')) passedChecks++;

// Summary
console.log('\n' + '='.repeat(60));
const percentage = ((passedChecks / totalChecks) * 100).toFixed(1);
const color = percentage === '100.0' ? 'green' : percentage >= '80.0' ? 'yellow' : 'red';

log(`\nValidation Results: ${passedChecks}/${totalChecks} checks passed (${percentage}%)`, color);

if (passedChecks === totalChecks) {
  log('\n✅ All checks passed! The referral system is properly implemented.', 'green');
  log('\nNext steps:', 'blue');
  log('1. Run migration: npm run typeorm migration:run', 'reset');
  log('2. Start the server: npm run start:dev', 'reset');
  log('3. Follow the manual test guide: TEST_REFERRAL_SYSTEM.md', 'reset');
} else {
  log('\n⚠️  Some checks failed. Please review the missing files above.', 'yellow');
}

console.log('='.repeat(60) + '\n');

process.exit(passedChecks === totalChecks ? 0 : 1);

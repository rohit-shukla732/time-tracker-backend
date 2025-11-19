#!/usr/bin/env node

/**
 * Workspace development utilities for ACE EMS
 * Usage: node scripts/workspace.js <command>
 */

const { execSync } = require('child_process');
const path = require('path');

const APPS = {
  'time-tracker': {
    name: 'time-tracker-backend',
    path: './apps/time-tracker-backend',
    description: 'Time Tracker Backend API'
  }
};

function runCommand(command, cwd = process.cwd()) {
  try {
    console.log(`\n🚀 Running: ${command}`);
    console.log(`📁 In: ${cwd}\n`);
    execSync(command, { 
      stdio: 'inherit', 
      cwd: cwd,
      shell: true 
    });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🏗️  ACE EMS Workspace Utilities

Available commands:
  dev <app>         Start development server for an app
  build <app>       Build an app for production
  build:all         Build all apps
  install           Install dependencies for all workspaces
  lint              Lint all workspaces
  clean             Clean build artifacts for all apps
  list              List all available apps
  help              Show this help message

Available apps:
${Object.entries(APPS).map(([key, app]) => 
  `  ${key.padEnd(15)} - ${app.description}`
).join('\n')}

Examples:
  node scripts/workspace.js dev time-tracker
  node scripts/workspace.js build:all
  node scripts/workspace.js install
`);
}

function listApps() {
  console.log('\n📱 Available applications:');
  Object.entries(APPS).forEach(([key, app]) => {
    console.log(`  • ${key} (${app.name})`);
    console.log(`    📂 ${app.path}`);
    console.log(`    📝 ${app.description}\n`);
  });
}

function main() {
  const [command, appName] = process.argv.slice(2);

  switch (command) {
    case 'dev':
      if (!appName || !APPS[appName]) {
        console.error(`❌ Please specify a valid app: ${Object.keys(APPS).join(', ')}`);
        process.exit(1);
      }
      runCommand('npm run dev', APPS[appName].path);
      break;

    case 'build':
      if (!appName || !APPS[appName]) {
        console.error(`❌ Please specify a valid app: ${Object.keys(APPS).join(', ')}`);
        process.exit(1);
      }
      runCommand('npm run build', APPS[appName].path);
      break;

    case 'build:all':
      console.log('🏗️  Building all applications...');
      Object.values(APPS).forEach(app => {
        runCommand('npm run build', app.path);
      });
      console.log('✅ All applications built successfully!');
      break;

    case 'install':
      runCommand('npm install');
      break;

    case 'lint':
      runCommand('npm run lint');
      break;

    case 'clean':
      console.log('🧹 Cleaning build artifacts...');
      Object.values(APPS).forEach(app => {
        runCommand('npm run clean', app.path);
      });
      console.log('✅ All build artifacts cleaned!');
      break;

    case 'list':
      listApps();
      break;

    case 'help':
    case undefined:
      showHelp();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();
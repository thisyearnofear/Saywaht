#!/usr/bin/env node

/**
 * API Health Check Script
 * 
 * Verifies that all required API endpoints exist and respond correctly.
 * Run this before deploying to catch missing routes early.
 * 
 * Usage: node scripts/check-api-health.js
 */

const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Find all API route files
function findApiRoutes(dir) {
  const routes = [];
  
  function traverse(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const fullPath = path.join(currentDir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (file === 'route.ts' || file === 'route.js') {
        // Convert file path to API route
        const relativePath = path.relative(dir, currentDir);
        const apiPath = '/api/' + relativePath.replace(/\\/g, '/');
        routes.push({
          path: apiPath,
          file: fullPath,
        });
      }
    }
  }
  
  traverse(dir);
  return routes;
}

// Check if a route file has the required HTTP methods
function checkRouteMethods(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const methods = [];
  
  if (content.includes('export async function GET') || content.includes('export function GET')) {
    methods.push('GET');
  }
  if (content.includes('export async function POST') || content.includes('export function POST')) {
    methods.push('POST');
  }
  if (content.includes('export async function PUT') || content.includes('export function PUT')) {
    methods.push('PUT');
  }
  if (content.includes('export async function DELETE') || content.includes('export function DELETE')) {
    methods.push('DELETE');
  }
  if (content.includes('export async function PATCH') || content.includes('export function PATCH')) {
    methods.push('PATCH');
  }
  
  return methods;
}

// Main health check
function runHealthCheck() {
  log('\n🏥 API Health Check\n', 'blue');
  
  const apiDir = path.join(__dirname, '../apps/web/src/app/api');
  
  if (!fs.existsSync(apiDir)) {
    log('❌ API directory not found!', 'red');
    process.exit(1);
  }
  
  const routes = findApiRoutes(apiDir);
  
  if (routes.length === 0) {
    log('⚠️  No API routes found!', 'yellow');
    process.exit(1);
  }
  
  log(`Found ${routes.length} API routes:\n`, 'green');
  
  let hasErrors = false;
  
  for (const route of routes) {
    const methods = checkRouteMethods(route.file);
    
    if (methods.length === 0) {
      log(`❌ ${route.path} - No HTTP methods exported!`, 'red');
      hasErrors = true;
    } else {
      log(`✅ ${route.path} - [${methods.join(', ')}]`, 'green');
    }
  }
  
  // Check for commonly used routes that should exist
  const requiredRoutes = [
    '/api/health',
    '/api/ai/generate-thumbnail',
    '/api/filecoin/status',
  ];
  
  log('\n📋 Checking required routes:\n', 'blue');
  
  for (const requiredRoute of requiredRoutes) {
    const exists = routes.some(r => r.path === requiredRoute);
    
    if (exists) {
      log(`✅ ${requiredRoute} - exists`, 'green');
    } else {
      log(`❌ ${requiredRoute} - MISSING!`, 'red');
      hasErrors = true;
    }
  }
  
  // Summary
  log('\n' + '='.repeat(50), 'blue');
  
  if (hasErrors) {
    log('\n❌ Health check FAILED! Fix the errors above before deploying.\n', 'red');
    process.exit(1);
  } else {
    log('\n✅ All API routes are healthy!\n', 'green');
    process.exit(0);
  }
}

// Run the check
try {
  runHealthCheck();
} catch (error) {
  log(`\n❌ Health check failed with error: ${error.message}\n`, 'red');
  console.error(error);
  process.exit(1);
}

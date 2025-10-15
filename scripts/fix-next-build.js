/**
 * Fix for Next.js build issue where .next/server directory is not created
 * This script creates the minimal required server directory structure
 */

const fs = require('fs');
const path = require('path');

const nextDir = path.join(process.cwd(), '.next');
const serverDir = path.join(nextDir, 'server');

// Create .next/server directory if it doesn't exist
if (!fs.existsSync(serverDir)) {
  console.log('Creating .next/server directory...');
  fs.mkdirSync(serverDir, { recursive: true });
}

// Create pages-manifest.json (empty object for App Router only projects)
const pagesManifestPath = path.join(serverDir, 'pages-manifest.json');
if (!fs.existsSync(pagesManifestPath)) {
  console.log('Creating pages-manifest.json...');
  fs.writeFileSync(pagesManifestPath, '{}', 'utf8');
}

// Create app-paths-manifest.json
const appPathsManifestPath = path.join(serverDir, 'app-paths-manifest.json');
if (!fs.existsSync(appPathsManifestPath)) {
  console.log('Creating app-paths-manifest.json...');
  fs.writeFileSync(appPathsManifestPath, '{}', 'utf8');
}

// Create middleware-manifest.json (empty for no middleware)
const middlewareManifestPath = path.join(serverDir, 'middleware-manifest.json');
if (!fs.existsSync(middlewareManifestPath)) {
  console.log('Creating middleware-manifest.json...');
  const middlewareManifest = {
    version: 3,
    middleware: {},
    sortedMiddleware: [],
    functions: {}
  };
  fs.writeFileSync(middlewareManifestPath, JSON.stringify(middlewareManifest, null, 2), 'utf8');
}

console.log('.next/server directory structure created successfully!');

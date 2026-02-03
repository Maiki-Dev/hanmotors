const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  let bestCandidate = null;

  for (const name of Object.keys(interfaces)) {
    // Skip virtual/internal interfaces
    if (name.toLowerCase().includes('vethernet') || 
        name.toLowerCase().includes('wsl') || 
        name.toLowerCase().includes('docker') ||
        name.toLowerCase().includes('pseudo')) {
      continue;
    }

    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Prioritize Wi-Fi
        if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wireless')) {
          return iface.address;
        }
        // Keep as candidate if no Wi-Fi found yet
        if (!bestCandidate) {
          bestCandidate = iface.address;
        }
      }
    }
  }
  return bestCandidate || '127.0.0.1';
}

const newIP = getLocalIP();
const newUrl = `http://${newIP}:5000`;

console.log(`Detected Local IP: ${newIP}`);
console.log(`Target API URL: ${newUrl}`);

const filesToUpdate = [
  path.join(__dirname, 'driver-app/src/config.js'),
  path.join(__dirname, 'admin-dashboard/src/config.js')
];

filesToUpdate.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let updated = false;
    
    const lines = content.split('\n');
    const newLines = lines.map(line => {
      // Update only active exports (ignore commented out lines)
      if (line.trim().startsWith('export const API_URL =')) {
        updated = true;
        // Keep any existing comments if possible, or just overwrite with a standard comment
        return `export const API_URL = '${newUrl}'; // Updated by script`;
      }
      return line;
    });

    if (updated) {
      fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
      console.log(`✅ Updated: ${filePath}`);
    } else {
      console.warn(`⚠️  Active API_URL export not found in: ${filePath}`);
    }
  } else {
    console.error(`❌ File not found: ${filePath}`);
  }
});

console.log('Done!');

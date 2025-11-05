const fs = require('fs');
const path = require('path');

// Function to increment version
function incrementVersion(version, type = 'patch') {
  const parts = version.split('.');
  
  if (parts.length !== 3) {
    console.error('Invalid version format. Expected x.y.z');
    process.exit(1);
  }
  
  let [major, minor, patch] = parts.map(Number);
  
  switch (type) {
    case 'major':
      major += 1;
      minor = 0;
      patch = 0;
      break;
    case 'minor':
      minor += 1;
      patch = 0;
      break;
    case 'patch':
    default:
      patch += 1;
      break;
  }
  
  return `${major}.${minor}.${patch}`;
}

try {
  // Parse version type from command line argument
  const versionType = process.argv[2] || 'patch';
  if (!['major', 'minor', 'patch'].includes(versionType)) {
    console.error('Invalid version type. Use "major", "minor", or "patch"');
    process.exit(1);
  }
  
  // Path to package.json
  const packageJsonPath = path.resolve(__dirname, '../package.json');
  
  // Read package.json
  const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageData.version;
  
  // Increment version
  const newVersion = incrementVersion(currentVersion, versionType);
  
  // Update package.json
  packageData.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageData, null, 2) + '\n');
  
  
  // Now generate the env file with the new version
  require('./generate-env');
  
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}

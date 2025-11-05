const fs = require('fs');
const path = require('path');

try {
  // Log the current directory and path
  const currentDir = __dirname;
  const packageJsonPath = path.resolve(__dirname, '../package.json');
  
  console.log(`Current directory: ${currentDir}`);
  console.log(`Looking for package.json at: ${packageJsonPath}`);
  
  // Check if the file exists first
  if (!fs.existsSync(packageJsonPath)) {
    console.error(` package.json not found at ${packageJsonPath}`);
    process.exit(1);
  }
  
  // Read package.json
  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, 'utf8')
  );

  // Get the version
  const version = packageJson.version;
  console.log(` Found version: ${version}`);
  // Create or update .env.local
  const envPath = path.resolve(__dirname, '../.env.local');
  let envContent = ``;
    // Check if .env.local already exists
  if (fs.existsSync(envPath)) {
    // Read existing content
    const existingContent = fs.readFileSync(envPath, 'utf8');
    
    // Process the file line by line to preserve multi-line values
    const lines = existingContent.split('\n');
    const processedLines = [];
    let currentVarName = null;
    let currentVarValue = null;
    let versionUpdated = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines or comments
      if (!line.trim() || line.trim().startsWith('#')) {
        processedLines.push(line);
        continue;
      }
      
      // Check if this line starts a new variable
      const varMatch = line.match(/^([^=]+)=(.*)$/);
      
      if (varMatch) {
        // We found a new variable
        const [, key, value] = varMatch;
        currentVarName = key.trim();
        currentVarValue = value;
        
        // If this is the version variable, update it
        if (currentVarName === 'NEXT_PUBLIC_APP_VERSION') {
          processedLines.push(`${currentVarName}=${version}`);
          versionUpdated = true;
        } else {
          processedLines.push(line);
        }
      } else {
        // This is a continuation of a multi-line value
        processedLines.push(line);
      }
    }
    
    // If the version wasn't in the file, add it
    if (!versionUpdated) {
      processedLines.push(`NEXT_PUBLIC_APP_VERSION=${version}`);
    }
    
    // Join all lines back together
    envContent = processedLines.join('\n');
    
    // Ensure the file ends with a newline
    if (!envContent.endsWith('\n')) {
      envContent += '\n';
    }
  } else {
    // If file doesn't exist, create with just the version
    envContent = `NEXT_PUBLIC_APP_VERSION=${version}\n`;
  }

  // Write to .env.local
  fs.writeFileSync(envPath, envContent);

  console.log(` Successfully set version ${version} in .env.local at ${envPath}`);
} catch (error) {
  console.error(`❌ Error occurred: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}

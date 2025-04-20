const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const versionServicePath = path.join(__dirname, '..', 'src', 'app', 'services', 'version.service.ts');

// Determine version bump type based on commit messages
function determineVersionBumpType() {
  try {
    // Get commit messages since the last tag
    const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo ""').toString().trim();
    
    const gitLogCommand = lastTag 
      ? `git log ${lastTag}..HEAD --pretty=format:"%s"` 
      : 'git log -n 20 --pretty=format:"%s"';
    
    const commitMessages = execSync(gitLogCommand).toString().split('\n');
    
    // Check for specific prefixes/keywords in commit messages
    const hasMajorChange = commitMessages.some(msg => 
      /^BREAKING CHANGE:|^major:/i.test(msg) || msg.includes('!:')
    );
    
    const hasMinorChange = commitMessages.some(msg => 
      /^feat:|^feature:/i.test(msg) || msg.includes('new feature')
    );
    
    // Determine bump type
    if (hasMajorChange) return 'major';
    if (hasMinorChange) return 'minor';
    return 'patch';
  } catch (error) {
    console.error('Error analyzing commit messages:', error);
    return 'patch'; // Default to patch version bump
  }
}

// Extract release notes from commit messages
function generateReleaseNotes() {
  try {
    // Get commit messages since the last tag
    const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo ""').toString().trim();
    
    const gitLogCommand = lastTag 
      ? `git log ${lastTag}..HEAD --pretty=format:"%s"` 
      : 'git log -n 10 --pretty=format:"%s"';
    
    const commitMessages = execSync(gitLogCommand).toString().split('\n');
    
    // Format commit messages into release notes
    return commitMessages
      .filter(msg => !msg.startsWith('Merge') && msg.trim() !== '')
      .map(msg => {
        // Clean up conventional commit format prefixes
        return msg.replace(/^(feat|fix|chore|docs|style|refactor|perf|test|ci|build)(\(.+?\))?:\s*/i, '');
      });
  } catch (error) {
    console.error('Error generating release notes:', error);
    return ['Bug fixes and improvements'];
  }
}

// Update package.json version
function updatePackageVersion(bumpType) {
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const currentVersion = packageJson.version;
  
  // Parse version
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  // Update version based on bump type
  let newVersion;
  switch (bumpType) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
    default:
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
  }
  
  // Write updated version
  packageJson.version = newVersion;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  return { currentVersion, newVersion };
}

// Update version service with new version info
function updateVersionService(newVersion, releaseNotes) {
  try {
    if (!fs.existsSync(versionServicePath)) {
      console.log('Version service not found, skipping update');
      return;
    }

    // Read the version service file
    let versionServiceContent = fs.readFileSync(versionServicePath, 'utf-8');
    
    // Get today's date formatted
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    // Create new version entry
    const [major, minor, patch] = newVersion.split('.').map(Number);
    
    const versionHistoryEntry = `
  {
    major: ${major},
    minor: ${minor},
    patch: ${patch},
    releaseDate: new Date('${formattedDate}'),
    changes: [
      ${releaseNotes.map(note => `'${note.replace(/'/g, "\\'")}'`).join(',\n      ')}
    ]
  },`;
    
    // Insert the new entry into the versionHistory array
    const versionHistoryRegex = /(private\s+versionHistory\s*:\s*VersionInfo\[\]\s*=\s*\[)([^]*?)(\s*\];)/;
    if (versionHistoryRegex.test(versionServiceContent)) {
      versionServiceContent = versionServiceContent.replace(
        versionHistoryRegex,
        (match, start, existing, end) => `${start}${versionHistoryEntry}${existing}${end}`
      );
    }
    
    // Write updated content back
    fs.writeFileSync(versionServicePath, versionServiceContent);
    console.log('Version service updated with new version information');
  } catch (error) {
    console.error('Error updating version service:', error);
  }
}

// Main execution
function run() {
  // Determine bump type based on commit messages
  const bumpType = determineVersionBumpType();
  console.log(`Determined version bump type: ${bumpType}`);
  
  // Update package.json
  const { currentVersion, newVersion } = updatePackageVersion(bumpType);
  console.log(`Updated version: ${currentVersion} → ${newVersion}`);
  
  // Generate release notes
  const releaseNotes = generateReleaseNotes();
  console.log('Generated release notes:');
  releaseNotes.forEach(note => console.log(`- ${note}`));
  
  // Update version service
  updateVersionService(newVersion, releaseNotes);
  
  // Return the new version for use in CI/CD
  return newVersion;
}

const newVersion = run();

// Export version for CI/CD
if (require.main === module) {
  // If run directly, output the version for CI/CD to capture
  console.log(`::set-output name=version::${newVersion}`);
} else {
  // If imported as a module
  module.exports = {
    determineVersionBumpType,
    generateReleaseNotes,
    updatePackageVersion,
    updateVersionService,
    run
  };
}
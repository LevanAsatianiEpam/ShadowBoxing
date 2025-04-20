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
      /^BREAKING CHANGE:|^major:|^feat!:/i.test(msg) || msg.includes('!:')
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
      })
      // Remove duplicates and limit to 10 entries
      .filter((value, index, self) => self.indexOf(value) === index)
      .slice(0, 10);
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
      return false;
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
      
      // Also update the current version if needed
      const currentVersionRegex = /private\s+currentVersion\s*:\s*VersionInfo\s*=\s*{\s*[^]*?\s*};/;
      
      const currentVersionReplacement = `private currentVersion: VersionInfo = {
    major: ${major},
    minor: ${minor},
    patch: ${patch},
    releaseDate: new Date('${formattedDate}'),
    changes: [
      ${releaseNotes.map(note => `'${note.replace(/'/g, "\\'")}'`).join(',\n      ')}
    ]
  };`;
      
      versionServiceContent = versionServiceContent.replace(
        currentVersionRegex,
        currentVersionReplacement
      );
      
      // Update constructor if it initializes currentVersion from package.json
      const constructorRegex = /constructor\(\)\s*{\s*[^]*?this\.currentVersion\s*=\s*{[^]*?};[^]*?}/;
      
      if (constructorRegex.test(versionServiceContent)) {
        versionServiceContent = versionServiceContent.replace(
          constructorRegex, 
          `constructor() {
    // Version info is managed by the CI/CD pipeline
    this.versionHistory = [this.currentVersion];
  }`
        );
      }
      
      // Write updated content back
      fs.writeFileSync(versionServicePath, versionServiceContent);
      console.log('Version service updated with new version information');
      return true;
    } else {
      console.error('Could not find versionHistory array in version service');
      return false;
    }
  } catch (error) {
    console.error('Error updating version service:', error);
    return false;
  }
}

// Commit changes if in CI environment
function commitChanges(newVersion) {
  try {
    if (process.env.CI) {
      console.log('Committing version changes in CI environment');
      execSync('git config --global user.name "GitHub Action"');
      execSync('git config --global user.email "action@github.com"');
      execSync('git add package.json src/app/services/version.service.ts');
      execSync(`git commit -m "chore: bump version to ${newVersion} [skip ci]"`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error committing changes:', error);
    return false;
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
  const serviceUpdated = updateVersionService(newVersion, releaseNotes);
  
  // Commit changes in CI environment
  if (serviceUpdated && process.env.CI) {
    commitChanges(newVersion);
  }
  
  // Return the new version for use in CI/CD
  return newVersion;
}

const newVersion = run();

// Export version for CI/CD
if (require.main === module) {
  // If run directly, output the version for CI/CD to capture
  console.log(`::set-output name=version::${newVersion}`);
  // Also ensure it's available as a GitHub Actions output
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${newVersion}\n`);
  }
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
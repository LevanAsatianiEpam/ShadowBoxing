const fs = require('fs');
const path = require('path');

// Define paths
const packageJsonPath = path.join(__dirname, 'package.json');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
const currentVersion = packageJson.version;

// Process command line args
const args = process.argv.slice(2);
const bumpType = args[0] || 'patch';  // Default to patch version bump
const releaseNotes = args.slice(1).join(' ');

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

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// Log result
console.log(`Version updated: ${currentVersion} → ${newVersion}`);
if (releaseNotes) {
  console.log(`Release notes: ${releaseNotes}`);
  console.log('Remember to update the release notes in the VersionService as well.');
}

// Instructions for next steps
console.log('\nNext steps:');
console.log('1. Update VersionService with release notes');
console.log('2. Commit changes: git commit -am "Bump version to ' + newVersion + '"');
console.log('3. Create a tag: git tag v' + newVersion);
console.log('4. Push changes: git push && git push --tags');
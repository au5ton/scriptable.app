const os = require('os');
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

function install(destination) {
  // check for existence before attempting a copy
  if(fs.existsSync(destination)) {
    console.log(`cp -R scriptable/* ${destination}`);
    shell.cp('-R', 'scriptable/*', destination);
  }
  else {
    console.log(`
An iCloud Drive directory couldn't be found where it was expected to be:

Expected location:
\t${destination}

If you're on Windows, make sure that iCloud for Windows has been installed.
https://support.apple.com/en-us/HT204283

If you're on macOS, make sure you have iCloud Drive enabled and have macOS Sierra (10.12) or greater installed.
https://support.apple.com/en-us/HT204025
`)
  }
}

switch(process.platform) {
  case 'darwin': {
    console.log(`macOS detected `);
    // ~/Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents
    const icloud = path.join(os.homedir(), 'Library', 'Mobile Documents', 'iCloud~dk~simonbs~Scriptable', 'Documents');
    install(icloud);
    break;
  }
  case 'win32': {
    console.lob('Windows detected');
    // C:\Users\Example\iCloudDrive\iCloud~dk~simonbs~Scriptable
    const icloud = path.join(os.homedir(), 'iCloudDrive', 'iCloud~dk~simonbs~Scriptable');
    install(icloud);
    break;
  }
  default: {
    console.log(`Your platform (${process.platform}) is not supported by this script.`);
  }
}
const os = require('os');
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');

function install(destination) {
  //shell.cp('-R', 'scriptable/', destination);
  console.log('does exist?', fs.existsSync(destination));
  console.log(shell.ls(destination));
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
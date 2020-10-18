// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: gamepad;
// share-sheet-inputs: plain-text;

// Data fetching function
async function getServerData(address) {
  const req = new Request(`https://api.mcsrvstat.us/2/${address}`);
  const res = await req.loadJSON();

  const playerList = res.online && res.players.uuid ? Object.keys(res.players.uuid).map(e => { return { username: e, uuid: res.players.uuid[e] }}) : [];

  // get player images
  for(let player of playerList) {
    player.head = `https://crafatar.com/avatars/${player.uuid}`;
  }

  return {
    version: res.version || '',
    motd: res.motd || '',
    online: res.online,
    hostname: res.hostname || '',
    icon: res.icon || '',
    playersOnline: res.online ? res.players.online : 0,
    playersMax: res.online ? res.players.max : '???',
    playerList: playerList
  };
}

// Synchronously create widget
async function createWidget(computedValues) {
  const { version, motd, online, hostname, icon, playersOnline, playersMax, playerList } = computedValues;

  const getFirstColor = () => {
    try {
      return new Color(motd.html[0].match(hexRegex)[0]);
    }
    catch(err) {
      return Color.white();
    }
  };

  const hexRegex = /(?:#)(?:[a-f0-9]{3}|[a-f0-9]{6})\b/ig;
  const motdText = online ? motd.clean[0] : 'Server is offline';
  const firstColor = getFirstColor();

  const grassBlockPng = Image.fromFile(`${FileManager.iCloud().documentsDirectory()}/MinecraftServerWidget/grass.png`);
  const serverIconPng = online ? Image.fromData(Data.fromBase64String(icon.split(',')[1])) : null;

  let w = new ListWidget()
  w.backgroundImage = grassBlockPng;
  w.useDefaultPadding();

  // Add server name heading
  let header = w.addStack();
  header.spacing = 2;
  if(online) {
    let logo = header.addImage(serverIconPng);
    logo.imageSize = new Size(40, 40);
  }
  header.addSpacer(null);
  let corner = header.addStack();
  corner.layoutVertically();
  let ver = corner.addText(`${version}`);
  ver.font = Font.boldSystemFont(14);
  ver.textColor = Color.white();
  let pmm = corner.addText(`${playersOnline} / ${playersMax}`);
  pmm.font = Font.boldSystemFont(14);
  pmm.textColor = Color.white();

  // spacer
  w.addSpacer(null);

  if(playersOnline === 0) {
    // Primary text is MOTD if no one is online
    let primaryText = w.addText(motdText);
    primaryText.font = Font.regularRoundedSystemFont(12);
    primaryText.textColor = firstColor;
  }
  else {
    //let primaryText = w.addText('Online');
    // primaryText.font = Font.boldSystemFont(14);
    // primaryText.textColor = Color.white();
    playerStackParent = w.addStack();
    let playerStackLeft = playerStackParent.addStack();
    let playerStackRight = playerStackParent.addStack();
    playerStackLeft.layoutVertically();
    playerStackLeft.setPadding(0, 0, 0, 2);
    playerStackRight.layoutVertically();
    playerStackRight.setPadding(0, 2, 0, 0);

    for(let i = 0; i <= Math.floor(playerList.length/2); i++) {
      let player = playerList[i];
      let row = playerStackLeft.addStack();
      let pHead = row.addImage(await (new Request(player.head)).loadImage());
      pHead.imageSize = new Size(16, 16);
      row.spacing = 3;
      let pName = row.addText(player.username);
      pName.font = Font.semiboldRoundedSystemFont(14);
      pName.textColor = Color.yellow();
    }

    for(let i = Math.ceil(playerList.length/2); i < playerList.length; i++) {
      let player = playerList[i];
      let row = playerStackRight.addStack();
      let pHead = row.addImage(await (new Request(player.head)).loadImage());
      pHead.imageSize = new Size(16, 16);
      row.spacing = 3;
      let pName = row.addText(player.username);
      pName.font = Font.semiboldRoundedSystemFont(14);
      pName.textColor = Color.yellow();
    }
  }

  // spacer
  w.addSpacer(null)

  // Add 'last updated' date to footer
  let footer = w.addStack();
  var nowDate = new Date();
  let date = footer.addDate(nowDate);
  //date.applyRelativeStyle();
  date.applyTimeStyle();
  date.font = Font.footnote();
  //date.font = Font.regularSystemFont(10);
  date.textColor = Color.white();
  date.leftAlignText();

  footer.addSpacer(null);

  if(online) {
    let symbol = footer.addImage(SFSymbol.named('wifi').image);
    symbol.tintColor = Color.green();
    symbol.imageSize = new Size(16, 16);
  }
  else {
    let symbol = footer.addImage(SFSymbol.named('wifi.exclamationmark').image);
    symbol.tintColor = Color.red();
    symbol.imageSize = new Size(16, 16);
  }

  return w;
}

/////////////
// Entrypoint
/////////////

// Gets variables from widgetParameter (if available)
// Otherwise, use Env.js module
function getEnv() {
  if(args.widgetParameter) {
    try {
      return args.widgetParameter;
    }
    catch(err) {
      throw 'Exception thrown while parsing widgetParameter';
    }
  }
  else {
    try {
      const { MC_SERVER_ADDRESS } = importModule('Env');
      return MC_SERVER_ADDRESS;
    }
    catch(err) {
      throw 'Exception thrown while parsing Env.js';
    }
  }
}

const ADDRESS = getEnv();

if (config.runsInWidget) {
  let widget = await createWidget(await getServerData(ADDRESS));
  Script.setWidget(widget);
  Script.complete();
} else {
  QuickLook.present(await createWidget(await getServerData(ADDRESS)));
}

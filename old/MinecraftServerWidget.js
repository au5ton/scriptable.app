// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: gamepad;
// share-sheet-inputs: plain-text;

// Data fetching function
async function getServerData(address) {
  const req = new Request(`https://api.mcsrvstat.us/2/${address}`);
  const res = await req.loadJSON();

  // Number of players allowed in the player preview area
  const PLAYER_LIMIT = 8;
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
    playerList: playerList.slice(0, PLAYER_LIMIT),
    software: res.software ? res.software : 'Vanilla',
  };
}

// Synchronously create widget
async function createWidget(computedValues) {
  const { version, motd, online, hostname, icon, playersOnline, playersMax, playerList, software } = computedValues;

  // Gets the first color inside the MOTD because applying multiple colors to a single text is too complicated in Scriptable
  const getFirstColor = () => {
    try {
      return new Color(motd.html[0].match(hexRegex)[0]);
    }
    catch(err) {
      return Color.white();
    }
  };

  // Prepare some constants
  const hexRegex = /(?:#)(?:[a-f0-9]{3}|[a-f0-9]{6})\b/ig;
  const motdText = online ? motd.clean[0] : 'Server is offline';
  const firstColor = getFirstColor();

  const grassBlockPng = Image.fromFile(`${FileManager.iCloud().documentsDirectory()}/MinecraftServerWidget/background.png`);
  const serverIconPng = online ? Image.fromData(Data.fromBase64String(icon.split(',')[1])) : null;

  // Setup widget
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
  // Add server info to corner
  let corner = header.addStack();
  corner.layoutVertically();
  corner.spacing = 1;

  // Server version
  let ver = corner.addText(`${version}`);
  ver.rightAlignText();
  ver.font = Font.boldSystemFont(12);
  ver.textColor = Color.white();
  ver.lineLimit = 1;
  ver.minimumScaleFactor = 0.35;

  // Server players online
  let pmm = corner.addText(`${playersOnline} / ${playersMax}`);
  pmm.rightAlignText();
  pmm.font = Font.boldSystemFont(12);
  pmm.textColor = Color.white();
  pmm.lineLimit = 1;
  pmm.minimumScaleFactor = 0.35;

  // If included, what kind of server
  if(software) {
    let soft = corner.addText(`${software} server`);
    soft.rightAlignText();
    soft.font = new Font('Menlo', 10);
    soft.textColor = Color.white();
    soft.lineLimit = 1;
    soft.minimumScaleFactor = 0.35;
  }

  // spacer
  w.addSpacer(null);

  if(playersOnline === 0) {
    // if no one is online, primary content is MOTD
    let primaryText = w.addText(motdText);
    primaryText.font = Font.regularRoundedSystemFont(12);
    primaryText.textColor = firstColor;
  }
  else {
    // if people are online, primary content is currently logged in players
    // setup 2 columns
    playerStackParent = w.addStack();
    let playerStackLeft = playerStackParent.addStack();
    let playerStackRight = playerStackParent.addStack();
    playerStackLeft.layoutVertically();
    playerStackLeft.setPadding(0, 0, 0, 2);
    playerStackLeft.spacing = 1;
    playerStackRight.layoutVertically();
    playerStackRight.setPadding(0, 2, 0, 0);
    playerStackRight.spacing = 1;

    // populate left column
    for(let i = 0; i < Math.floor(playerList.length/2); i++) {
      let player = playerList[i];
      let row = playerStackLeft.addStack();
      row.size = new Size(0, 13);
      let pHead = row.addImage(await (new Request(player.head)).loadImage());
      pHead.imageSize = new Size(12, 12);
      row.spacing = 3;
      let pName = row.addText(player.username);
      pName.font = Font.semiboldRoundedSystemFont(12);
      pName.textColor = Color.yellow();
      pName.lineLimit = 1;
      pName.minimumScaleFactor = 0.35;
    }

    // populate right column
    for(let i = Math.ceil(playerList.length/2); i < playerList.length; i++) {
      let player = playerList[i];
      let row = playerStackRight.addStack();
      row.size = new Size(0, 13);
      let pHead = row.addImage(await (new Request(player.head)).loadImage());
      pHead.imageSize = new Size(12, 12);
      row.spacing = 3;
      let pName = row.addText(player.username);
      pName.font = Font.semiboldRoundedSystemFont(12);
      pName.textColor = Color.yellow();
      pName.lineLimit = 1;
      pName.minimumScaleFactor = 0.35;
    }

    // If too many players to list them all, then show a message
    if(playersOnline > playerList.length) {
      let cont = w.addText(`+ ${playersOnline - playerList.length} more `);
      cont.centerAlignText();
      cont.font = Font.italicSystemFont(10);
      cont.textColor = new Color('#cccccc');
    }
  }

  // Add spacer if we have no player overflow
  if(playersOnline === playerList.length) w.addSpacer(null)

  // Add 'last updated' date to footer
  let footer = w.addStack();
  var nowDate = new Date();
  let date = footer.addDate(nowDate);
  date.applyTimeStyle();
  date.font = Font.footnote();
  date.textColor = Color.white();
  date.leftAlignText();

  // Add spacer for online indicator
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

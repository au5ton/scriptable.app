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
  //const playerList = res.online && res.players.uuid ? Object.keys(res.players.uuid).map(e => { return { username: e, uuid: res.players.uuid[e] }}) : [];

  const playerList = [
    // { username: 'auston', uuid: '5e0b134e-dfd2-46e8-99af-2ecfe272970c' },
    // { username: 'heber1', uuid: 'da4bad99-509f-4c6a-8ad4-da8d32fbfd7e' },
    // { username: 'Notch', uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5' },
    // { username: 'jeb_', uuid: '853c80ef-3c37-49fd-aa49-938b674adae6' },
    // { username: 'Dinnerbone', uuid: '61699b2e-d327-4a01-9f1e-0ea8c3f06bc6' },
    // { username: 'Grumm', uuid: 'e6b5c088-0680-44df-9e1b-9bf11792291b' },
    // { username: 'TheShinyG', uuid: '76a8b93b-7100-4248-ae17-c9aeb5436a9e' },
    // { username: 'Honeydew', uuid: '8f9bc2ed-1bb5-41ed-91be-02625c76bd7f' },
    // { username: 'Zoned4', uuid: '1f4e070d-0f91-4cad-8265-0607b5cf1a32' },
    // { username: 'SethBling', uuid: '55a2e72e-0161-4c85-b191-a0b227ff758a' },
    // { username: 'EthosLab', uuid: '4f41dcda-449a-46b7-8635-88979061fdd2' },
    // { username: 'paulsoaresjr', uuid: '06d8a457-891e-4f99-9d5c-c1e2b33f3321' },
    // { username: 'CaptainSparklez', uuid: '5f820c39-5883-4392-b174-3125ac05e38c' },
    // { username: 'FVDisco', uuid: '31feb2c6-1394-4de8-b418-e6b217dd2d04' },
    // { username: 'Grumm', uuid: 'e6b5c088-0680-44df-9e1b-9bf11792291b' }
    // { username: 'End_Knight', uuid: 'c6b802f0-da83-4e63-bda1-28dde3a62d4f' },
    // { username: 'FluffThePanda', uuid: '48d4d27c-3d56-4b97-bf2e-b960ebf5e985' },
    // { username: 'petfeesh', uuid: 'c2cfc2f8-e60b-4009-b3b7-35e0a807e502' },
    // { username: 'medumdum', uuid: '550df348-aa9b-45dd-a2dd-473ef311d57a' },
    // { username: 'robuttastic', uuid: '5a113935-22c5-48f3-b01b-92c61449ab84' }
  ];

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
    //playersOnline: res.online ? res.players.online : 0,
    playersOnline: playerList.length,
    playersMax: res.online ? res.players.max : '???',
    playerList: playerList.slice(0, PLAYER_LIMIT),
    software: res.software ? res.software : 'Vanilla',
  };
}

// Synchronously create widget
async function createWidget(computedValues) {
  const { version, motd, online, hostname, icon, playersOnline, playersMax, playerList, software } = computedValues;

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
  corner.spacing = 1;
  let ver = corner.addText(`${version}`);
  ver.rightAlignText();
  ver.font = Font.boldSystemFont(12);
  ver.textColor = Color.white();
  ver.lineLimit = 1;
  ver.minimumScaleFactor = 0.35;
  let pmm = corner.addText(`${playersOnline} / ${playersMax}`);
  pmm.rightAlignText();
  pmm.font = Font.boldSystemFont(12);
  pmm.textColor = Color.white();
  pmm.lineLimit = 1;
  pmm.minimumScaleFactor = 0.35;
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
    // Primary text is MOTD if no one is online
    let primaryText = w.addText(motdText);
    primaryText.font = Font.regularRoundedSystemFont(12);
    primaryText.textColor = firstColor;
  }
  else {
    // Show logged in usernames
    playerStackParent = w.addStack();
    let playerStackLeft = playerStackParent.addStack();
    let playerStackRight = playerStackParent.addStack();
    playerStackLeft.layoutVertically();
    playerStackLeft.setPadding(0, 0, 0, 2);
    playerStackLeft.spacing = 1;
    playerStackRight.layoutVertically();
    playerStackRight.setPadding(0, 2, 0, 0);
    playerStackRight.spacing = 1;

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

    if(playersOnline > playerList.length) {
      let cont = w.addText(`+ ${playersOnline - playerList.length} more `);
      cont.centerAlignText();
      cont.font = Font.italicSystemFont(10);
      cont.textColor = new Color('#cccccc');
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

// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: server; share-sheet-inputs: plain-text;

// Declare some constants
const { PLEX_HOST, PLEX_TOKEN } = importModule('Env');

const PLEX_LOGO_SVG = Image.fromFile(`${FileManager.iCloud().documentsDirectory()}/PlexStreamsWidget/plex-app-icon.png`);

await QuickLook.present(PLEX_LOGO_SVG);

// Declare some modules
const PlexAPI = importModule('PlexAPI');

function isTranscode(metadata) {
  if(metadata['type'] === 'track') {
    return false;
  }
  else if(metadata['Media'] && Array.isArray(metadata['Media']) && metadata['Media'].filter(e => e['selected']).length > 0) {
    
    return ! metadata['Media']
      .filter(e => e['selected']) // get only "media" that are "selected"
      [0]['Part']
      .filter(e => e['selected']) // get only "parts" that are "selected"
      [0]['Stream']
      .every(e => e['decision'] !== 'transcode'); // if all aren't transcode, directplay. conversely, at least 1 transcode.

  }
  else {
    return false;
  }
}

function getBandwidth(metadata) {
  if(metadata['type'] === 'track') {
    if(metadata['Media'] && metadata['Media'].filter(e => e['audioCodec']).length > 0) {
      return parseFloat(metadata['Media'].filter(e => e['audioCodec'])[0]['bitrate']);
    }
    else {
      return 0;
    }
  }
  else if(metadata['Session']) {
    return parseFloat(metadata['Session']['bandwidth']);
  }
  else {
    return 0;
  }
}

// Link to API
const plex = new PlexAPI(PLEX_HOST, PLEX_TOKEN);
await plex.init();

// Fetch specific server information
const serverName = (await plex.get('/'))['MediaContainer']['friendlyName']
const sessions = await plex.get('/status/sessions');
const sessionCount = 12 || sessions['MediaContainer']['size'];
const transcodeCount = sessionCount === 0 ? 0 : sessions['MediaContainer']['Metadata']
  .map(item => isTranscode(item)) // get bool array of transcodes
  .map(bool => bool ? 1 : 0) // turn bools into 1 or 0
  .reduce((n,x) => n + x); // get sum of 1/0 array
const bandwidthUsedKilobits = sessionCount === 0 ? 0 : sessions['MediaContainer']['Metadata']
  .map(item => getBandwidth(item))  // get bandwidth measurements
  .reduce((n,x) => n + x); // sum them up
//const resources = await plex.get('/statistics/resources');

// const filtered = sessions['MediaContainer']['Metadata']
//   .filter(item => 
//     item['type'] === 'track' &&
//     item['User']['title'] === plex.plexUser);

// if(filtered.length > 0) {
//   let mediaUrl = filtered[0]['Media'][0]['Part'][0]['key'];
//   let extension = filtered[0]['Media'][0]['Part'][0]['container'];
//   let artistTitle = filtered[0]['grandparentTitle'];
//   let songTitle = filtered[0]['title'];

//   //const fm = FileManager.iCloud();
//   //fm.createDirectory(`${fm.documentsDirectory()}/PlexContent`, true);
//   //fm.write(`${fm.documentsDirectory()}/PlexContent/${artistTitle} - ${songTitle}.${extension}`, await plex.getData(mediaUrl));
// }

if (config.runsInWidget) {
  let widget = createWidget(args.widgetParameter);
  Script.setWidget(widget);
  Script.complete();
} else {
  QuickLook.present(createWidget());
}

function createWidget() {
  const plexBlackColor = new Color('#1f2326');
  const plexGreyColor = new Color('#BCBDBE');
  const plexOrangeColor = new Color('#e5a00d');

  let w = new ListWidget()
  w.backgroundColor = plexBlackColor;
  w.useDefaultPadding();

  // Add server name heading
  let header = w.addStack();
  let leftStack = header.addStack();
  let rightStack = header.addStack();
  rightStack.addSpacer(null);
  let name = leftStack.addText(serverName);
  name.font = Font.boldRoundedSystemFont(16);
  name.textColor = plexGreyColor;
  let logo = rightStack.addImage(SFSymbol.named('play.fill').image);
  logo.tintColor = plexOrangeColor;
  logo.imageSize = new Size(16, 16);
  //logo.rightAlignImage();

  // spacer
  w.addSpacer(null);

  // Add number of transcodes
  let primaryText = w.addText(`${sessionCount} stream${sessionCount === 1 ? '' : 's'}`);
  primaryText.font = Font.boldRoundedSystemFont(22);
  primaryText.textColor = plexOrangeColor;

  // Add number of transcodes
  let secondaryText = w.addText(`${transcodeCount} transcode${transcodeCount === 1 ? '' : 's'}`);
  secondaryText.font = Font.semiboldRoundedSystemFont(18);
  secondaryText.textColor = plexGreyColor;

  // Add bandwidth usage
  let row = w.addStack();
  let tertiaryText = row.addText(`${Math.round(bandwidthUsedKilobits / 100) / 10} Mbps `);
  tertiaryText.font = Font.mediumRoundedSystemFont(14);
  tertiaryText.textColor = plexGreyColor;
  let symbol = row.addImage(SFSymbol.named('arrow.up.arrow.down').image);
  symbol.tintColor = plexGreyColor;
  symbol.imageSize = new Size(16, 16);

  // spacer
  w.addSpacer(null)

  // Add 'last updated' date to footer
  let footer = w.addStack();
  var nowDate = new Date();
  let date = footer.addDate(nowDate);
  date.applyRelativeStyle();
  date.font = Font.footnote();
  date.textColor = plexGreyColor;
  let ago = footer.addText(' ago');
  ago.font = Font.footnote();
  ago.textColor = plexGreyColor;

  return w;
}

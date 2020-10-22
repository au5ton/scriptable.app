// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: server; share-sheet-inputs: plain-text;

// Data fetching function
async function getPlexData(host, token) {
  // Link to API
  const PlexAPI = importModule('PlexStreamsWidget/PlexAPI');
  const plex = new PlexAPI(host, token);
  await plex.init();

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

  // Fetch specific server information
  const serverName = (await plex.get('/'))['MediaContainer']['friendlyName']
  const sessions = await plex.get('/status/sessions');
  const sessionCount = sessions['MediaContainer']['size'];
  const transcodeCount = sessionCount === 0 ? 0 : sessions['MediaContainer']['Metadata']
    .map(item => isTranscode(item)) // get bool array of transcodes
    .map(bool => bool ? 1 : 0) // turn bools into 1 or 0
    .reduce((n,x) => n + x); // get sum of 1/0 array
  const bandwidthUsedKilobits = sessionCount === 0 ? 0 : sessions['MediaContainer']['Metadata']
    .map(item => getBandwidth(item))  // get bandwidth measurements
    .reduce((n,x) => n + x); // sum them up

  return {
    serverName,
    sessionCount,
    transcodeCount,
    bandwidthUsedKilobits
  }
}

// Synchronously create widget
function createWidget(computedValues) {

  console.log(computedValues);

  const { serverName, sessionCount, transcodeCount, bandwidthUsedKilobits } = computedValues;

  const plexLogoPng = Image.fromFile(`${FileManager.iCloud().documentsDirectory()}/PlexStreamsWidget/plex-logo.png`);
  const plexBlackColor = new Color('#1f2326');
  const plexGreyColor = new Color('#BCBDBE');
  const plexOrangeColor = new Color('#e5a00d');

  let w = new ListWidget()
  w.backgroundColor = plexBlackColor;
  w.useDefaultPadding();

  // Add server name heading
  let header = w.addStack();
  header.spacing = 2;
  let logo = header.addImage(plexLogoPng);
  logo.imageSize = new Size(20, 20);
  let name = header.addText(serverName);
  name.font = Font.boldRoundedSystemFont(16);
  name.textColor = plexGreyColor;
  name.lineLimit = 1;
  name.minimumScaleFactor = 0.5;

  // spacer
  w.addSpacer(null);

  // Add number of transcodes
  let primaryText = w.addText(`${sessionCount} stream${sessionCount === 1 ? '' : 's'}`);
  primaryText.font = Font.boldRoundedSystemFont(22);
  primaryText.textColor = plexOrangeColor;

  // Add number of transcodes
  let secondaryText = w.addText(`${transcodeCount} transcode${transcodeCount === 1 ? '' : 's'}`);
  secondaryText.font = Font.semiboldRoundedSystemFont(16);
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
  //date.applyRelativeStyle();
  date.applyTimeStyle();
  date.font = Font.footnote();
  //date.font = Font.regularSystemFont(10);
  date.textColor = plexGreyColor;
  date.leftAlignText();
  //let ago = footer.addText(' ago');
  //ago.font = Font.footnote();
  //ago.textColor = plexGreyColor;

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
      const { PLEX_HOST, PLEX_TOKEN } = JSON.parse(args.widgetParameter);
      return { PLEX_HOST, PLEX_TOKEN };
    }
    catch(err) {
      throw 'Exception thrown while parsing widgetParameter';
    }
  }
  else {
    try {
      const { PLEX_HOST, PLEX_TOKEN } = importModule('Env');
      return { PLEX_HOST, PLEX_TOKEN };
    }
    catch(err) {
      throw 'Exception thrown while parsing Env.js';
    }
  }
}

const { PLEX_HOST, PLEX_TOKEN } = getEnv();

if (config.runsInWidget) {
  let widget = createWidget(await getPlexData(PLEX_HOST, PLEX_TOKEN));
  Script.setWidget(widget);
  Script.complete();
} else {
  QuickLook.present(createWidget(await getPlexData(PLEX_HOST, PLEX_TOKEN)));
}

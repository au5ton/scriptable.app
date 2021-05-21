// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: server; share-sheet-inputs: plain-text;

/////////////
// Edit these if you're debugging or testing
/////////////

const environment = {
  PLEX_HOST: '',
  PLEX_TOKEN: ''
};

/////////////
// Library code
/////////////

// API convenience class
class PlexAPI {
  constructor(plexHost, plexToken) {
      this.plexHost = plexHost; // 123.123.123.123:45678
      this.plexToken = plexToken; // qwertyuiop
      this.plexUser = null; // filled after init() is called
  }
  async get(path) {
      const req = new Request(`http://${this.plexHost}${path}?X-Plex-Token=${this.plexToken}`);
      req.headers = {
      Accept: 'application/json'
      };
      return await req.loadJSON();
  }
  async getData(path) {
      const req = new Request(`http://${this.plexHost}${path}?X-Plex-Token=${this.plexToken}`);
      return await req.load();
  }
  async getPlexTV(path) {
      const req = new Request(`https://plex.tv${path}?X-Plex-Token=${this.plexToken}`);
      req.headers = {
      Accept: 'application/json'
      };
      return await req.loadJSON();
  }
  async init() {
      let userData = await this.getPlexTV('/api/v2/user');
      this.plexUser = userData['username'];
  }
}

// Data fetching function
async function getPlexData(host, token) {
  // Link to API
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

/////////////
// Cache code
/////////////

function getCachePath() {
  let fm = FileManager.iCloud();
  return fm.joinPath(fm.documentsDirectory(), 'cache', 'au5ton');
}

function getCacheResourcesUrl() {
  return 'https://au5ton.github.io/scriptable.app/resources/';
}

async function initCache() {
  let fm = FileManager.iCloud();
  let cachePath = getCachePath();
  // check if cache directory exists
  if(! fm.fileExists(cachePath)){
    fm.createDirectory(cachePath, true);
  }
  // declare the location where to get some remote images
  const RESOURCES_URL = getCacheResourcesUrl();
  const required_files = ['plex-logo.png'];
  // download the files, if they aren't already cached
  for(let file of required_files) {
    let cacheFile = fm.joinPath(cachePath, file);
    // if file doesn't exist, download it locally
    if(! fm.fileExists(cacheFile)) {
      fm.write(cacheFile, await new Request(`${RESOURCES_URL}${file}`).load());
    }
    else {
      
    }
  }
  return cachePath;
}

async function accessCache(file) {
  let fm = FileManager.iCloud();
  let cachePath = getCachePath();
  let cacheFile = fm.joinPath(cachePath, file);
  const RESOURCES_URL = getCacheResourcesUrl();

  // if file doesn't exist, download it locally
  if(! fm.fileExists(cacheFile)) {
    fm.write(cacheFile, await new Request(`${RESOURCES_URL}${file}`).load());
  }
  else {
    // file exists locally, but is it downloaded?
    if(! fm.isFileDownloaded(cacheFile)) {
      // download it if we don't have it ready to use
      await fm.downloadFileFromiCloud(cacheFile);
    }
  }
  // return the fully qualified path name
  return cacheFile;
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
      const { PLEX_HOST, PLEX_TOKEN } = environment;
      return { PLEX_HOST, PLEX_TOKEN };
    }
    catch(err) {
      throw 'Exception thrown while destructuring environment';
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

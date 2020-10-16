// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: server; share-sheet-inputs: plain-text;

const PLEX_HOST = '111.222.111.222:45678';
const PLEX_TOKEN = 'qwertyuiop';

const PlexAPI = importModule('PlexAPI');
const plex = new PlexAPI(PLEX_HOST, PLEX_TOKEN);
await plex.init();

const serverName = (await plex.get('/'))['MediaContainer']['friendlyName']

const sessions = await plex.get('/status/sessions');
const sessionCount = sessions['MediaContainer']['Metadata'].length;

if (config.runsInWidget) {
  let widget = createWidget()
  Script.setWidget(widget)
  Script.complete()
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
  let header = w.addText(serverName);
  header.font = Font.boldRoundedSystemFont(16);
  header.textColor = plexGreyColor;

  // Add number of transcodes
  let bodyText = w.addText(`${sessionCount} stream${sessionCount > 1 ? 's' : ''}`);
  bodyText.font = Font.mediumRoundedSystemFont(22);
  bodyText.textColor = plexOrangeColor;

  // Add 'last updated' date to footer   
  var nowDate = new Date();
  var nowFormDate = nowDate.toLocaleTimeString('en-US');
  let footer = w.addText(`as of ${nowFormDate}`);
  footer.font = Font.footnote();
  footer.textColor = plexGreyColor;

  return w;
}

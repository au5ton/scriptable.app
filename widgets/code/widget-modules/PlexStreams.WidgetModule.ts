// Based on https://github.com/au5ton/scriptable.app/blob/75cdb02e1229fc4c4338169657e4f782f9a935bf/PlexStreamsWidget.js

import { ErrorWidget } from "code/components/widgets/ErrorWidget"
import { SimpleTextWidget } from "code/components/widgets/SimpleTextWidget"
import { IWidgetModule } from 'code/utils/interfaces'
import { RequestWithTimeout } from "code/utils/request-utils"

import { PlexAPI } from 'code/classes/PlexAPI';
import { ResourceCache } from 'code/classes/ResourceCache';

const widgetModule: IWidgetModule = {
  createWidget: async (params) => {
    // extract user data
    const { host, token } = parseWidgetParameter(params.widgetParameter)

    // get interesting data
    const { serverName, sessionCount, transcodeCount, bandwidthUsedKilobits } = await getPlexData(host, token);

    // get image from cache
    const cache = new ResourceCache('plex', ['plex-logo.png']);
    await cache.initCache();

    const plexLogoPng = Image.fromFile(await cache.accessCache('plex-logo.png'));
    const plexBlackColor = new Color('#1f2326', 1);
    const plexGreyColor = new Color('#BCBDBE', 1);
    const plexOrangeColor = new Color('#e5a00d', 1);

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
    w.addSpacer();

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
    w.addSpacer(undefined)

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
}

const parseWidgetParameter = (param: string) => {
  // handles: <token>@<host> || @<host> || <host>
  const paramParts = param.replace(/ /g, '').split('@')
  let token: string = '';
  let host: string = '';
  switch (paramParts.length) {
      case 1: [host] = paramParts; break;
      case 2: [token, host] = paramParts; break;
  }
  return { token, host }
}

// Data fetching function
async function getPlexData(host: string, token: string) {
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



module.exports = widgetModule;


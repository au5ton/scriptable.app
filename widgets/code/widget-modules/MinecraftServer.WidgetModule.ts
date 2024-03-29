// Based on https://github.com/au5ton/scriptable.app/blob/75cdb02e1229fc4c4338169657e4f782f9a935bf/PlexStreamsWidget.js

import { ErrorWidget } from "code/components/widgets/ErrorWidget"
import { SimpleTextWidget } from "code/components/widgets/SimpleTextWidget"
import { IWidgetModule } from 'code/utils/interfaces'
import { RequestWithTimeout, getJSON } from "code/utils/request-utils"

import { ResourceCache } from 'code/classes/ResourceCache';

const widgetModule: IWidgetModule = {
  createWidget: async (params) => {
    // extract user data
    const address = parseWidgetParameter(params.widgetParameter)

    // get interesting data
    const { version, motd, online, hostname, icon, playersOnline, playersMax, playerList, software } = await getServerData(address);

    // get image from cache
    const cache = new ResourceCache('minecraft', ['stone.png']);
    await cache.initCache();

    // Gets the first color inside the MOTD because applying multiple colors to a single text is too complicated in Scriptable
    const getFirstColor = () => {
      if(motd !== undefined && motd.html !== undefined && Array.isArray(motd.html) && motd.html.length > 0) {
        let match = motd.html![0].match(hexRegex);
        if(match !== null) {
          return new Color(match[0], 1);
        }
      }
      return Color.white();
    };

    const decodeBase64Image = (icn: string): Image | undefined => {
      try {
        return Image.fromData(Data.fromBase64String(icn.split(',')[1]))
      }
      catch(err) {
        return undefined;
      }
    };

    // Prepare some constants
    const hexRegex = /(?:#)(?:[a-f0-9]{3}|[a-f0-9]{6})\b/ig;
    const motdText = online && motd !== undefined && motd.clean !== undefined ? motd.clean[0] : 'Server is offline';
    const firstColor = getFirstColor();

    const grassBlockPng = Image.fromFile(await cache.accessCache('stone.png'));
    const serverIconPng = decodeBase64Image(icon);

    // Setup widget
    let w = new ListWidget()
    w.backgroundImage = grassBlockPng;
    w.useDefaultPadding();

    // Add server name heading
    let header = w.addStack();
    header.spacing = 2;
    if(online && serverIconPng !== undefined) {
      let logo = header.addImage(serverIconPng);
      logo.imageSize = new Size(40, 40);
    }
    header.addSpacer();
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
    w.addSpacer();

    if(playersOnline === 0) {
      // if no one is online, primary content is MOTD
      let primaryText = w.addText(motdText);
      primaryText.font = Font.regularRoundedSystemFont(12);
      primaryText.textColor = firstColor;
    }
    else {
      // if people are online, primary content is currently logged in players
      // setup 2 columns
      let playerStackParent = w.addStack();
      let playerStackLeft = playerStackParent.addStack();
      let playerStackRight = playerStackParent.addStack();
      playerStackLeft.layoutVertically();
      playerStackLeft.setPadding(0, 0, 0, 2);
      playerStackLeft.spacing = 1;
      playerStackRight.layoutVertically();
      playerStackRight.setPadding(0, 2, 0, 0);
      playerStackRight.spacing = 1;

      // chunk array
      const [leftColumnPlayers, rightColumnPlayers] = chunkArray(playerList, 2);

      // populate left column
      if(Array.isArray(leftColumnPlayers)) {
        for(let player of leftColumnPlayers) {
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
      }

      // populate right column
      if(Array.isArray(rightColumnPlayers)) {
        for(let player of rightColumnPlayers) {
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
      }

      // If too many players to list them all, then show a message
      if(playersOnline > playerList.length) {
        let cont = w.addText(`+ ${playersOnline - playerList.length} more `);
        cont.centerAlignText();
        cont.font = Font.italicSystemFont(10);
        cont.textColor = new Color('#cccccc', 1);
      }
    }

    // Add spacer if we have no player overflow
    if(playersOnline === playerList.length) w.addSpacer()

    // Add 'last updated' date to footer
    let footer = w.addStack();
    var nowDate = new Date();
    let date = footer.addDate(nowDate);
    date.applyTimeStyle();
    date.font = Font.footnote();
    date.textColor = Color.white();
    date.leftAlignText();

    // Add spacer for online indicator
    footer.addSpacer();

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
}

const parseWidgetParameter = (param: string) => {
  return typeof param === 'string' ? param : '';
}

// Data fetching function
async function getServerData(address) {
  const res = await getJSON<ServerStatus>(`https://api.mcsrvstat.us/2/${address}`)

  // Number of players allowed in the player preview area
  const PLAYER_LIMIT = 8;
  const playerList: PlayerInfo[] = res.online && res.players !== undefined && res.players.uuid !== undefined ? Object.keys(res.players.uuid).map(e => { return { username: e, uuid: res.players!.uuid![e], head: '' }}) : [];

  // get player images
  for(let player of playerList) {
    player.head = `https://crafatar.com/avatars/${player.uuid}?default=MHF_Steve&overlay`;
  }

  return {
    version: res.version || '',
    motd: res.motd || undefined,
    online: res.online,
    hostname: res.hostname || '',
    icon: res.icon || '',
    playersOnline: res.online && res.players !== undefined ? res.players.online : 0,
    playersMax: res.online && res.players !== undefined ? res.players.max : '???',
    playerList: playerList.slice(0, PLAYER_LIMIT),
    software: res.software ? res.software : 'Vanilla',
  };
}

export interface ServerStatus {
  online: boolean;
  ip: string;
  port: number;
  debug: Debug;
  motd?: MotdOrInfo;
  players?: ServerPlayers;
  version?: string;
  protocol?: number;
  hostname?: string;
  icon?: string;
  software?: string;
  map?: string;
  plugins?: PluginsOrMods;
  mods?: PluginsOrMods;
  info?: MotdOrInfo;
}
export interface Debug {
  ping: boolean;
  query: boolean;
  srv: boolean;
  querymismatch: boolean;
  ipinsrv: boolean;
  cnameinsrv: boolean;
  animatedmotd: boolean;
  cachetime: number;
}
export interface MotdOrInfo {
  raw?: string[];
  clean?: string[];
  html?: string[];
}
export interface ServerPlayers {
  online: number;
  max: number;
  list?: string[];
  uuid?: { [key: string]: string };
}
export interface PluginsOrMods {
  names?: string[];
  raw?: string[];
}
export interface PlayerInfo {
  username: string;
  uuid: string;
  head: string;
}

// See: https://stackoverflow.com/a/46122602
function chunkArray<T>(arr: T[], n: number): T[][] {
  let chunkLength = Math.max(arr.length/n ,1);
  let chunks: T[][] = [];
  for (let i = 0; i < n; i++) {
    if(chunkLength*(i+1) <= arr.length) chunks.push(arr.slice(chunkLength*i, chunkLength*(i+1)));
  }
  return chunks; 
}


module.exports = widgetModule;

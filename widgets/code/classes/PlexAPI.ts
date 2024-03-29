import { getJSON } from 'code/utils/request-utils';

/**
 * Utility class for iteracting with the Plex Media Server API and Plex.tv API
 */
export class PlexAPI {
  plexHost: string;
  plexToken: string;
  plexUser: string | null;
  constructor(plexHost: string, plexToken: string) {
      this.plexHost = plexHost; // 123.123.123.123:45678
      this.plexToken = plexToken; // qwertyuiop
      this.plexUser = null; // filled after init() is called
  }
  /** GET Request wrapper for your Plex server */
  async get(path) {
    return await getJSON(`http://${this.plexHost}${path}?X-Plex-Token=${this.plexToken}`);
  }
  /** GET Request wrapper for your Plex server */
  async getData(path) {
    const req = new Request(`http://${this.plexHost}${path}?X-Plex-Token=${this.plexToken}`);
    return await req.load();
  }
  /** GET Request wrapper for plex.tv */
  async getPlexTV(path) {
    const req = new Request(`https://plex.tv${path}?X-Plex-Token=${this.plexToken}`);
    req.headers = {
      Accept: 'application/json'
    };
    return await req.loadJSON();
  }
  /** Run this when starting a PlexAPI instance */
  async init() {
    let userData = await this.getPlexTV('/api/v2/user');
    this.plexUser = userData['username'];
  }
}
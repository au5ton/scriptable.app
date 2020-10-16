// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: orange; icon-glyph: file-video;
module.exports = class PlexAPI {
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
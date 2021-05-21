(function () {

    const addFlexSpacer = ({ to }) => {
        // @ts-ignore
        to.addSpacer();
    };

    const SimpleTextWidget = (pretitle, title, subtitle, color) => {
        let w = new ListWidget();
        w.backgroundColor = new Color(color, 1);
        let preTxt = w.addText(pretitle);
        preTxt.textColor = Color.white();
        preTxt.textOpacity = 0.8;
        preTxt.font = Font.systemFont(10);
        w.addSpacer(5);
        let titleTxt = w.addText(title);
        titleTxt.textColor = Color.white();
        titleTxt.font = Font.systemFont(16);
        w.addSpacer(5);
        let subTxt = w.addText(subtitle);
        subTxt.textColor = Color.white();
        subTxt.textOpacity = 0.8;
        subTxt.font = Font.systemFont(12);
        addFlexSpacer({ to: w });
        let a = w.addText("");
        a.textColor = Color.white();
        a.textOpacity = 0.8;
        a.font = Font.systemFont(12);
        return w;
    };

    const ErrorWidget = (subtitle) => {
        return SimpleTextWidget("ERROR", "Widget Error", subtitle, "#000");
    };

    /**
     * Utility class for iteracting with the Plex Media Server API and Plex.tv API
     */
    class PlexAPI {
        constructor(plexHost, plexToken) {
            this.plexHost = plexHost; // 123.123.123.123:45678
            this.plexToken = plexToken; // qwertyuiop
            this.plexUser = null; // filled after init() is called
        }
        /** GET Request wrapper for your Plex server */
        async get(path) {
            const req = new Request(`http://${this.plexHost}${path}?X-Plex-Token=${this.plexToken}`);
            req.headers = {
                'Accept': 'application/json'
            };
            return await req.loadJSON();
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
                'Accept': 'application/json'
            };
            return await req.loadJSON();
        }
        /** Run this when starting a PlexAPI instance */
        async init() {
            let userData = await this.getPlexTV('/api/v2/user');
            this.plexUser = userData['username'];
        }
    }

    /**
     * Tiny util to make downloading and saving relevant resources easier
     */
    class ResourceCache {
        /** prepare some paths */
        constructor(scope, requiredFiles) {
            this.resourcesBaseUrl = 'https://scriptable.austinj.net/resources/';
            this.fm = FileManager.iCloud();
            this.cachePath = this.fm.joinPath(this.fm.joinPath(this.fm.joinPath(this.fm.documentsDirectory(), 'cache'), 'au5ton-scriptable'), scope);
            this.requiredFiles = requiredFiles;
            // create cache directory, if it doesn't already exist
            this.enforceDirectory(this.cachePath);
        }
        enforceDirectory(path) {
            if (this.fm.fileExists(path) && !this.fm.isDirectory(path)) {
                this.fm.remove(path);
            }
            if (!this.fm.fileExists(path)) {
                this.fm.createDirectory(path, true);
            }
        }
        /** initialize the cache */
        async initCache() {
            // constructor should've done this, but lets do it again anyway
            this.enforceDirectory(this.cachePath);
            // download the files, if they aren't already cached
            for (let file of this.requiredFiles) {
                await this.accessCache(file);
            }
        }
        /** access the cache */
        async accessCache(file) {
            let cacheFile = this.fm.joinPath(this.cachePath, file);
            // if file doesn't exist, download it locally
            if (!this.fm.fileExists(cacheFile)) {
                this.fm.write(cacheFile, await new Request(`${this.resourcesBaseUrl}${file}`).load());
            }
            else {
                // if it does exist, is it already downloaded from iCloud?
                if (!this.fm.isFileDownloaded(cacheFile)) {
                    // download it from iCloud
                    await this.fm.downloadFileFromiCloud(cacheFile);
                }
            }
            return cacheFile;
        }
    }

    // Based on https://github.com/au5ton/scriptable.app/blob/75cdb02e1229fc4c4338169657e4f782f9a935bf/PlexStreamsWidget.js
    const widgetModule = {
        createWidget: async (params) => {
            try {
                // extract user data
                const { host, token } = parseWidgetParameter(params.widgetParameter);
                // get interesting data
                const { serverName, sessionCount, transcodeCount, bandwidthUsedKilobits } = await getPlexData(host, token);
                // get image from cache
                const cache = new ResourceCache('plex', ['plex-logo.png']);
                await cache.initCache();
                const plexLogoPng = Image.fromFile(await cache.accessCache('plex-logo.png'));
                const plexBlackColor = new Color('#1f2326', 1);
                const plexGreyColor = new Color('#BCBDBE', 1);
                const plexOrangeColor = new Color('#e5a00d', 1);
                let w = new ListWidget();
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
                w.addSpacer(undefined);
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
            catch (err) {
                return ErrorWidget(err);
            }
        }
    };
    const parseWidgetParameter = (param) => {
        // handles: <token>@<host> || @<host> || <host>
        const paramParts = param.toLowerCase().replace(/ /g, "").split("@");
        let token = '';
        let host = '';
        switch (paramParts.length) {
            case 1:
                [host] = paramParts;
                break;
            case 2:
                [token, host] = paramParts;
                break;
        }
        return { token, host };
    };
    // Data fetching function
    async function getPlexData(host, token) {
        // Link to API
        const plex = new PlexAPI(host, token);
        await plex.init();
        function getBandwidth(metadata) {
            if (metadata['type'] === 'track') {
                if (metadata['Media'] && metadata['Media'].filter(e => e['audioCodec']).length > 0) {
                    return parseFloat(metadata['Media'].filter(e => e['audioCodec'])[0]['bitrate']);
                }
                else {
                    return 0;
                }
            }
            else if (metadata['Session']) {
                return parseFloat(metadata['Session']['bandwidth']);
            }
            else {
                return 0;
            }
        }
        function isTranscode(metadata) {
            if (metadata['type'] === 'track') {
                return false;
            }
            else if (metadata['Media'] && Array.isArray(metadata['Media']) && metadata['Media'].filter(e => e['selected']).length > 0) {
                return !metadata['Media']
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
        const serverName = (await plex.get('/'))['MediaContainer']['friendlyName'];
        const sessions = await plex.get('/status/sessions');
        const sessionCount = sessions['MediaContainer']['size'];
        const transcodeCount = sessionCount === 0 ? 0 : sessions['MediaContainer']['Metadata']
            .map(item => isTranscode(item)) // get bool array of transcodes
            .map(bool => bool ? 1 : 0) // turn bools into 1 or 0
            .reduce((n, x) => n + x); // get sum of 1/0 array
        const bandwidthUsedKilobits = sessionCount === 0 ? 0 : sessions['MediaContainer']['Metadata']
            .map(item => getBandwidth(item)) // get bandwidth measurements
            .reduce((n, x) => n + x); // sum them up
        return {
            serverName,
            sessionCount,
            transcodeCount,
            bandwidthUsedKilobits
        };
    }
    module.exports = widgetModule;

}());

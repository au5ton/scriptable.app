/**
 * Tiny util to make downloading and saving relevant resources easier
 */
export class ResourceCache {
  fm: FileManager;
  cachePath: string;
  resourcesBaseUrl = 'https://scriptable.austinj.net/resources/';
  requiredFiles: string[];

  /** prepare some paths */
  constructor(scope: string, requiredFiles: string[]) {
    this.fm = FileManager.iCloud();
    this.cachePath = this.fm.joinPath(this.fm.joinPath(this.fm.joinPath(this.fm.documentsDirectory(), 'cache'), 'au5ton-scriptable'), scope);
    this.requiredFiles = requiredFiles;


    // create cache directory, if it doesn't already exist
    this.enforceDirectory(this.cachePath);
  }

  private enforceDirectory(path: string) {
    if (this.fm.fileExists(path) && !this.fm.isDirectory(path)) {
      this.fm.remove(path)
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
    for(let file of this.requiredFiles) {
      await this.accessCache(file);
    }
  }

  /** access the cache */
  async accessCache(file: string): Promise<string> {
    let cacheFile = this.fm.joinPath(this.cachePath, file);
    // if file doesn't exist, download it locally
    if(! this.fm.fileExists(cacheFile)) {
      this.fm.write(cacheFile, await new Request(`${this.resourcesBaseUrl}${file}`).load());
    }
    else {
      // if it does exist, is it already downloaded from iCloud?
      if(! this.fm.isFileDownloaded(cacheFile)) {
        // download it from iCloud
        await this.fm.downloadFileFromiCloud(cacheFile);
      }
    }
    return cacheFile;
  }
}

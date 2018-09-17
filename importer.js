const path = require('path');

const csv = require('fast-csv');
const _ = require('underscore');

class Importer {
  constructor(imageMagick, opts) {
    this.imageMagick = imageMagick;
    this.promosFile = opts.promosFile;
    this.pageFiles = opts.pageFiles;
    this.fullSizeWidth = opts.fullSizeWidth;
    this.thumbnailWidth = opts.thumbnailWidth;
    this.outputPath = opts.outputPath;
    this.filePrefix = opts.filePrefix;

    this.promos = [];
    this.manifest = {
      period: {
        start: 'FILL_ME_IN',
        end: 'FILL_ME_IN',
      },
      links: {
        download: 'FILL_ME_IN'
      },
      pages: []
    };
  }

  makeOutputPath(filename) {
    return path.normalize(
      path.join(this.outputPath, filename)
    );
  }

  loadPromo(raw) {
    if (!raw.page_id || !raw.upcs || !raw.x || !raw.y || !raw.width || !raw.height) {
      console.log('Ignoring invalid promo:', raw);
      return;
    }

    this.promos.push({
      page_id: parseInt(raw.page_id),
      upcs: raw.upcs.split(/\s*,\s*/),
      title: raw.title || '',
      x: parseFloat(raw.x),
      y: parseFloat(raw.y),
      width: parseFloat(raw.width),
      height: parseFloat(raw.height)
    });
  }

  loadPromos() {
    return new Promise((resolve, reject) => {
      const promos = [];
      
      const csvOpts = {
        headers: true
      }

      csv.fromPath(this.promosFile, csvOpts)
        .on('data', promo => this.loadPromo(promo))
        .on('end', () => resolve(promos))
        .on('data-invalid', () => reject('Invalid row'));
    });
  }

  async import() {
    await this.loadPromos();

    // Promos are grouped by page ID and those page IDs are sorted according
    // to their numeric value. This way page_id values don't need to be
    // 0-based. Their numerically-sorted order just needs to match what is
    // provided in this.pageFiles.
    const promosByPage = _.groupBy(this.promos, 'page_id');
    const orderedPageIds = Object.keys(promosByPage)
      .sort((a, b) => parseInt(a) - parseInt(b));

    for(let pageId = 0; pageId < this.pageFiles.length; pageId++) {
      console.log('Processing page %d/%d', pageId + 1, this.pageFiles.length)

      const promos = promosByPage[orderedPageIds[pageId]] || [];
      await this.processPage(
        this.pageFiles[pageId],
        promos,
        pageId
      );
    }
  }

  async processPage(pageFile, promos, pageId) {
    const ext = path.extname(pageFile);
    const basename = path.basename(pageFile, ext);
    const fullName = `${this.filePrefix}${basename}-full${ext}`;
    const thumbName = `${this.filePrefix}${basename}-thumb${ext}`;
    const fullPath = this.makeOutputPath(fullName);
    const thumbPath = this.makeOutputPath(thumbName);

    // Add definition to manifest.
    this.manifest.pages[pageId] = {
      links: {
        full: fullName,
        thumb: thumbName
      },
      ads: []
    };

    // Process full- and thumb-sized versions.
    await this.imageMagick.createFromMaxWidth(pageFile, this.fullSizeWidth, fullPath);
    await this.imageMagick.createFromMaxWidth(pageFile, this.thumbnailWidth, thumbPath);

    // Process promos under this page.
    for (let i = 0; i < promos.length; i++) {
      await this.processPromo(promos[i], i + 1, pageId, pageFile, fullName);
    }
  }

  async processPromo(promo, promoNumber, pageId, pageFile) {
    const ext = path.extname(pageFile);
    const basename = path.basename(pageFile, ext);
    promoNumber = promoNumber > 9 ? String(promoNumber) : '0' + String(parseInt(promoNumber));
    const filename = `${this.filePrefix}${basename}-${promoNumber}${ext}`;
    const filePath = this.makeOutputPath(filename);

    // Add definition to manifest.
    this.manifest.pages[pageId].ads.push({
      title: promo.title,
      upcs: promo.upcs,
      x: promo.x,
      y: promo.y,
      width: promo.width,
      height: promo.height,
      links: {
        full: filename
      }
    });

    // Process regions into ad images.
    await this.imageMagick.extractRegionByPct(pageFile, promo, filePath);
  }
}

module.exports = Importer;

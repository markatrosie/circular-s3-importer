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

  loadPromo(raw) {
    if (!raw.page_id || !raw.upcs || !raw.x || !raw.y || !raw.width || !raw.height) {
      throw new Error('Invalid promo loaded');
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
        headers: true,
        delimiter: '|'
      }

      csv.fromPath(this.promosFile, csvOpts)
        .on('data', promo => this.loadPromo(promo))
        .on('end', () => resolve(promos))
        .on('data-invalid', () => reject('Invalid row'));
    });
  }

  async import() {
    await this.loadPromos();
    const promosByPage = _.groupBy(this.promos, 'page_id');
    const pageProcessing = Object.keys(promosByPage).map(
      (key, pageId) => this.processPage(
        this.pageFiles[pageId],
        promosByPage[key],
        pageId + 1
      )
    );

    await Promise.all(pageProcessing);
  }

  async processPage(pageFile, promos, pageNum) {
    const ext = path.extname(pageFile);
    const basename = path.basename(pageFile, ext);
    const fullName = `${basename}-full${ext}`;
    const thumbName = `${basename}-thumb${ext}`;

    // Add definition to manifest.
    this.manifest.pages[pageNum] = {
      links: {
        full: fullName,
        thumb: thumbName
      },
      ads: []
    };

    // Process full- and thumb-sized versions.
    await this.imageMagick.createFromMaxWidth(pageFile, this.fullSizeWidth, fullName);
    await this.imageMagick.createFromMaxWidth(pageFile, this.thumbnailWidth, thumbName);

    // Process promos under this page.
    for (let i = 0; i < promos.length; i++) {
      await this.processPromo(promos[i], i + 1, pageNum, pageFile);
    }
  }

  async processPromo(promo, promoNumber, pageNum, pageFile) {
    const basename = path.basename(pageFile);
    const ext = path.extname(pageFile);
    const filename = `${basename}-${pageNum}-${promoNumber}${ext}`;

    // Add definition to manifest.
    this.manifest.pages[pageNum].ads.push({
      title: promo.title,
      upcs: promo.upcs,
      x: promo.x,
      y: promo.y,
      width: promo.width,
      height: promo.height
    });

    // Process regions into ad images.
    await this.imageMagick.extractRegionByPct(pageFile, promo, filename);
  }
}

module.exports = Importer;

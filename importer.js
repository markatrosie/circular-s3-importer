const path = require('path');
const { exec } = require('child_process');

const sizeOfImage = require('image-size');
const csv = require('fast-csv');
const _ = require('underscore');

magickPath = '"C:\\Program\ Files\\ImageMagick-7.0.8-Q16\\magick.exe"';

function runCommand(cmdArgs) {
  return new Promise((resolve, reject) => {
    const fullCmd = cmdArgs.join(' ');
    console.log('>> ', fullCmd);
    exec(fullCmd, {}, (error, stdout, stderr) => {
      if (error) {
        console.log(stderr);
        reject(error.Error);
      } else {
        resolve();
      }
    });
  });
}

class Importer {
  constructor(args) {
    this.promosFile = args.promosFile;
    this.pageFiles = args.pageFiles;
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
    await runCommand([magickPath, pageFile, '-resize "1200\\>"', fullName]);
    await runCommand([magickPath, pageFile, '-resize "300\\>"', thumbName]);

    // Process promos under this page.
    for (let i = 0; i < promos.length; i++) {
      await this.processPromo(promos[i], i + 1, pageNum, pageFile);
    }
  }

  async processPromo(promo, promoNumber, pageNum, pageFile) {
    const basename = path.basename(pageFile);
    const ext = path.extname(pageFile);
    const filename = `${basename}-${pageNum}-${promoNumber}${ext}`;
    const imageDimensions = sizeOfImage(pageFile);

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
    const regionPx = {
      x: promo.x / 100 * imageDimensions.width,
      y: promo.y / 100 * imageDimensions.height,
      width: promo.width / 100 * imageDimensions.width,
      height: promo.height / 100 * imageDimensions.height
    }
    const cropSize = `${regionPx.width}x${regionPx.height}`;
    const cropOffset = `+${regionPx.x}+${regionPx.y}\!`;
    const cropGeometry = cropSize + cropOffset;
    await runCommand([magickPath, pageFile, '-crop', cropGeometry, filename]);
  }
}

module.exports = Importer;

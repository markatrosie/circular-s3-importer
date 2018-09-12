const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const csv = require('fast-csv');
const _ = require('underscore');

magickPath = '"C:\\Program\ Files\\ImageMagick-7.0.8-Q16\\magick.exe"';

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

    this.manifest.pages[pageNum] = {
      links: {
        full: fullName,
        thumb: thumbName
      },
      ads: []
    };

    await this.runCommand([magickPath, pageFile, '-resize "1200\\>"', fullName]);
    await this.runCommand([magickPath, pageFile, '-resize "300\\>"', thumbName]);

    processingPromos = promos.map(
      (promo, promoId) => this.processPromo(
        promo,
        promoId + 1,
        pageNum,
        pageFile
      )
    );

    await Promise.all(processingPromos);
  }

  async processPromo(promo, promoNumber, pageNum, pageFile) {
    const basename = path.basename(pageFile);
    const ext = path.extname(pageFile);
    const filename = `${basename}-${pageNum}-${promoNumber}${ext}`;
    this.manifest.pages[pageNum].ads.push(promo);
    await this.runCommand([magickPath, pageFile, '-crop', `${promo.x}x${promo.y}+${promo.width}+${promo.height}\!`, filename]);
  }

  runCommand(cmdArgs) {
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
}

module.exports = Importer;

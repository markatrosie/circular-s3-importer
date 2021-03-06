const { exec } = require('child_process');

const sizeOfImage = require('image-size');

class ImageMagick {
  constructor(pathToMagick, quiet) {
    this.pathToMagick = pathToMagick;
    this.quiet = typeof quiet === undefined ? false : Boolean(quiet);
  }

  log() {
    this.quiet || console.log.apply(console, arguments);
  }

  execMagick(cliParams) {
    return new Promise((resolve, reject) => {
      const fullCmd = this.pathToMagick + ' ' + cliParams.join(' ');
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

  async createFromMaxWidth(originalPath, maxWidth, outputPath) {
    const resizeSpec = `-resize "${maxWidth}\\>"`;
    this.log('Max width %f -->', maxWidth, outputPath);
    await this.execMagick([originalPath, resizeSpec, outputPath]);
  }

  async extractRegionByPct(originalPath, region, outputPath) {
    const imageDimensions = sizeOfImage(originalPath);
    const regionByPct = {
      x: region.x / 100 * imageDimensions.width,
      y: region.y / 100 * imageDimensions.height,
      width: region.width / 100 * imageDimensions.width,
      height: region.height / 100 * imageDimensions.height
    };

    await this.extractRegionByPx(originalPath, regionByPct, outputPath);
  }

  async extractRegionByPx(originalPath, region, outputPath) {
    const cropSize = `${region.width}x${region.height}`;
    const cropOffset = `+${region.x}+${region.y}!`;
    const cropSpec = `-crop "${cropSize}${cropOffset}"`;

    this.log('Extracting [%f, %f, %f, %f] -->',
      region.x, region.y, region.width, region.height, outputPath);
    await this.execMagick([originalPath, cropSpec, outputPath]);
  }
}

module.exports = ImageMagick;
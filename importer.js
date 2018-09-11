const { spawn } = require('child_process');
const csv = require('fast-csv');

class Importer {
  constructor() {

  }

  import() {
    console.log('importing...');
  }

  slice(x, y, h, w, filename) {
    // magick page.png -crop #{x}x#{y}+#{w}+#{h}\! filename
  }

  resize(size, filename, suffix) {
    // magick #{filename} -resize #{size}\> filename.ext
  }
}

module.exports = Importer;
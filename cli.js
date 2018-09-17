#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const run = require('./runner');

/**
 * Things that should come through CLI options if this is ever made more robust.
 */
const config = {
  imageMagickPath: '"C:\\Program\ Files\\ImageMagick-7.0.8-Q16\\magick.exe"',
  fullSizeWidth: 1200,
  thumbnailWidth: 300
};

const EXIT_CODES = {
  BAD_ARGS: 1
};

function usage() {
  console.log('Usage: npm run import <outputDir> <promosFile> <page1File> [<page2File>, ...]');
  console.log('');
  console.log(
    'This will generate a mostly complete manifest for these pages, and will '
    + 'generate full size and thumbnail images for them as well. It will '
    + 'additionally take the input from promosFile and produce sliced ad '
    + 'images for each promo defined. All files will be generated into '
    + 'outputDir, possibly replacing what is already there. Be cautious.'
  );
}

function parseArgs(args) {
  if (args.length < 3) {
    usage();
    process.exit(EXIT_CODES.BAD_ARGS);
  }

  const parsed = {
    outputPath: path.normalize(args[0]),
    promosFile: args[1],
    pageFiles: args.slice(2),
    fullSizeWidth: config.fullSizeWidth,
    thumbnailWidth: config.thumbnailWidth,
    imageMagickPath: config.imageMagickPath
  }

  if (!fs.existsSync(parsed.outputPath)) {
    console.log(`Unable to continue: outputPath "${parsed.outputPath}" does not exist`);
  }

  return parsed;
}

const args = parseArgs(process.argv.slice(2));

run(args)
  .then(() => console.log('Import complete.'))
  .catch((error) => console.log('Import failed:', error));

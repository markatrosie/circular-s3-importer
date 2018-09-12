const fs = require('fs');

const Importer = require('./importer');

/**
 * Input: <promosFile> <page1File> [<page2File>, ...]
 *  <promosFile>   weekly_ad_promos.psv
 *  <pageNFile>    the image file for each page of the ad
 * Output: (standard output)
 *  Circular definition suitable for manifest.json, containing all
 *  pages and ads.
 */

const EXIT_CODES = {
  BAD_ARGS: 1
};

function usage() {
  console.log('Usage: npm run import <promosFile> <page1File> [<page2File>, ...]');
  console.log('');
  console.log(
    'This will generate a mostly complete manifest for these pages, and will '
    + 'generate full size and thumbnail images for them as well. It will '
    + 'additionally take the input from promosFile and produce sliced ad '
    + 'images for each promo defined.'
  );
}

function parseArgs(args) {
  if (args.length < 2) {
    usage();
    process.exit(EXIT_CODES.BAD_ARGS);
  }

  const parsed = {
    promosFile: args[0],
    pageFiles: args.slice(1)
  }

  return parsed;
}

function writeManifestFile(manifest) {
  return new Promise((resolve, reject) => {
    const manifestPath = './manifest.json';
    const manifestJson = JSON.stringify(manifest);
    fs.writeFile(manifestPath, manifestJson,
      (error) => error && reject(error) || resolve());
  });
}

async function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);
  const importer = new Importer(parsed);  
  await importer.import();
  await writeManifestFile(importer.manifest);
}

main()
  .then(() => console.log('Import complete.'))
  .catch((error) => console.log('Import failed:', error));

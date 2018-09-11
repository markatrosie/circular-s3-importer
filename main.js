const Importer = require('./importer');

/**
 * Input: <promosFile> <page1File> [<page2File>, ...]
 *  <promosFile>   weekly_ad_promos.psv
 *  <pageNFile>    the image file for each page of the ad
 * Output: (standard output)
 *  Circular definition suitable for manifest.json, containing all
 *  pages and ads.
 * 
 * Process:
 *  - Initialize empty manifest
 *  - Load promos file into array of <column, value> objects
 *  - Validate expected headers: page_id, upcs, x, y, width, height
 *  - Validate pageNFile for each N in unique page_id
 *  - For each page N...
 *    - Add manifest.pages[N] definition
 *    - magick #{N} -resize #{1200}\> #{N-full}
 *    - magick #{N} -resize #{300}\> #{N-thumb}
 *    - For each ad A in N...
 *      - Add manifest.pages[N].ads[A] definition
 *      - magick #{N} -crop #{ad.x}x#{ad.y}+#{ad.w}+#{ad.h}\! #{N-ad-A}
 *  - Output manifest.json to stdout
 */

const EXIT_CODES = {
  BAD_ARGS: 1
};

function usage() {
  console.log('Usage: npm run import <promosFile> <page1File> [<page2File>, ...]');
  console.log('');
  console.log('Results will be displayed directly to standard output, so make sure to capture it to a file.');
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

function main() {
  const args = process.argv.slice(2);
  const parsed = parseArgs(args);
  console.log(parsed);
  const importer = new Importer(args);
  importer.import();
}

main();

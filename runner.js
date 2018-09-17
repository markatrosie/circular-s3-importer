const fs = require('fs');
const path = require('path');

const Importer = require('./importer');
const ImageMagick = require('./imagemagick');

function writeManifestFile(manifest, outputDirPath) {
  return new Promise((resolve, reject) => {
    const manifestPath = path.join(outputDirPath, 'manifest.json');
    const manifestJson = JSON.stringify(manifest, null, 2);
    fs.writeFile(manifestPath, manifestJson,
      (error) => error && reject(error) || resolve());
  });
}

async function run(args) {
  const imageMagick = new ImageMagick(args.imageMagickPath);
  const importer = new Importer(imageMagick, args);
  await importer.import();
  await writeManifestFile(importer.manifest, args.outputPath);
}

module.exports = run;

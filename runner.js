const fs = require('fs');
const Importer = require('./importer');

const ImageMagick = require('./imagemagick');

function writeManifestFile(manifest) {
  return new Promise((resolve, reject) => {
    const manifestPath = './manifest.json';
    const manifestJson = JSON.stringify(manifest, null, 2);
    fs.writeFile(manifestPath, manifestJson,
      (error) => error && reject(error) || resolve());
  });
}

async function run(args) {
  const imageMagick = new ImageMagick(args.imageMagickPath);
  const importer = new Importer(imageMagick, args);
  await importer.import();
  await writeManifestFile(importer.manifest);
}

module.exports = run;
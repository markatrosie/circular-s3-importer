# circular-s3-importer
Node tool for processing a retailer import package into a format appropriate for S3.

## Installation Instructions

1. Install ImageMagick
1. Install NodeJS
1. Install this tool using `npm install -g <this GIT repository>`

The script is not ideally robust at this time. After installing, you will may to locate and edit the `cli.js` file of this package and update the `imageMagickPath` config variable according to where your executable is stored.

## Usage

`circular-import <path to weekly-ad-promos.psv> <path to page 1> [<path to page 2>, ...]`

Your current directory will be populated with new files, possibly overwriting what is there:

1. A `-thumb.ext` and `-full.ext` variation of each page file.
1. A `-#.ext` file for each promo on each page. For example, `page1-1.png`, `page1-2.png`, and so on.
1. A mostly populated `manifest.json` file describing these pages and promotions.

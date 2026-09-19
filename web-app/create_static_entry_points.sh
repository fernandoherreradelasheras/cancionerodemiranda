#!/usr/bin/bash

set -e

echo "Writing static entry points with per-page metadata and prerendered content, sitemap.xml and robots.txt"
node prerender.mjs

echo "Generating Bing site validation files"
echo '<?xml version="1.0"?><users><user>DB232364EC2AD3FD0DEE89466109C874</user></users>' > dist/BingSiteAuth.xml
echo '62907ae0b0c546dc991f2d8d67d8b151' > dist/62907ae0b0c546dc991f2d8d67d8b151.txt

echo "Copying image assets"
mkdir -p dist/assets
cp -v ../assets/* dist/assets

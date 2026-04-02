#!/usr/bin/bash

echo "Copying entry point index.html to static routes"

mkdir -p dist/{tono,tonos,about,progreso}
cp dist/index.html dist/tonos/index.html
cp dist/index.html dist/about/index.html
cp dist/index.html dist/progreso/index.html
for i in {1..77}; do
  mkdir dist/tono/$i
  cp dist/index.html dist/tono/$i/index.html
done

echo "Generating sitemap.xml"
SITEMAP="dist/sitemap.xml"
echo '<?xml version="1.0" encoding="UTF-8"?>' > $SITEMAP
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' >> $SITEMAP
echo '  <url><loc>https://cdm.humanoydivino.com/</loc></url>' >> $SITEMAP
echo '  <url><loc>https://cdm.humanoydivino.com/tonos/</loc></url>' >> $SITEMAP
echo '  <url><loc>https://cdm.humanoydivino.com/about/</loc></url>' >> $SITEMAP
echo '  <url><loc>https://cdm.humanoydivino.com/progreso/</loc></url>' >> $SITEMAP
for i in {1..77}; do
  echo "  <url><loc>https://cdm.humanoydivino.com/tono/$i/</loc></url>" >> $SITEMAP
done
echo '</urlset>' >> $SITEMAP

echo "Copying image assets"
mkdir -p dist/assets
cp -v ../assets/* dist/assets

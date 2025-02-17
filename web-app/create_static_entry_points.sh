#!/usr/bin/bash

echo "Copying entry point index.html to static routes"

mkdir -p dist/{tono,tonos,about}
cp dist/index.html dist/tonos/index.html
cp dist/index.html dist/about/index.html
for i in {1..77}; do
  cp dist/index.html dist/tono/$i
done

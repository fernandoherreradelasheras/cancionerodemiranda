xmlstarlet ed -P -L \
  -N mei="http://www.music-encoding.org/ns/mei" \
  -s "//mei:app[@type='voice_reconstruction'][not(rdg)]" \
  -t elem -n "rdg" \
  -v "" \
  -i "//mei:app[@type='voice_reconstruction']/mei:rdg[not(@label)]" \
  -t attr -n "label" -v "none" \
  "$1"

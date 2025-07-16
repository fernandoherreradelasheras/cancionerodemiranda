TMP=`mktemp -d`
SCRIPTDIR=`dirname "$0"`

echo "Performing dissonant analysis for file $1"
echo '!!!filter: dissonant' > $TMP/dissonant-analysis.krn
python $SCRIPTDIR/filter_editorials.py "$1" | mei2hum |  extract -i '**kern' >> $TMP/dissonant-analysis.krn
verovio $TMP/dissonant-analysis.krn  -t mei -o $TMP/dissonant-analysis.mei
java -cp /usr/share/java/saxon/saxon-he.jar net.sf.saxon.Transform -s:$TMP/dissonant-analysis.mei "-xsl:$SCRIPTDIR/fix_mei_measure_ns.xsl" -o:$TMP/dissonant-analysis-with-n.mei
python "$SCRIPTDIR/merge_harm.py" "$1" "$TMP/dissonant-analysis-with-n.mei" "$2"
if [ $? != 0 ]; then
  echo "error merging harm elements. Kept temporal files at $TMP"
  exit 1
fi

rm -rf $TMP
echo "New file with merged analysis as <harm> elements: '$2'"

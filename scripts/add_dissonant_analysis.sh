TMP=`mktemp -d`
SCRIPTDIR=`dirname "$0"`

echo '!!!filter: dissonant' > $TMP/dissonant-analysis.krn
cat "$1" | mei2hum |  extract -i '**kern' >> $TMP/dissonant-analysis.krn
verovio $TMP/dissonant-analysis.krn  -t mei -o $TMP/dissonant-analysis.mei
java -cp /usr/share/java/saxon/saxon-he.jar net.sf.saxon.Transform -s:$TMP/dissonant-analysis.mei -xsl:../../scripts/fix_mei_measure_ns.xsl -o:$TMP/dissonant-analysis-with-n.mei
python "$SCRIPTDIR/merge_harm.py" "$1" "$TMP/dissonant-analysis-with-n.mei" "$2"

rm -rf $TMP

echo "Created '$2'"
echo "Use --app-x-path-query \"./rdg[contains(@type, 'dissonant_analysis')]\" to visualize it"

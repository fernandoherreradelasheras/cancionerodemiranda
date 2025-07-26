TMP=`mktemp -d`
SCRIPTDIR=`dirname "$0"`

echo "Performing dissonant analysis for file $1"

xmlstarlet ed  -P -N mei="http://www.music-encoding.org/ns/mei"  -d '//mei:app[mei:rdg[@type="dissonant_analysis"]]' "$1" > $TMP/clean.mei
python $SCRIPTDIR/filter_editorials.py $TMP/clean.mei > $TMP/filtered.mei
python3 -m converter21 -f mei -t humdrum $TMP/filtered.mei  $TMP/filtered.krn 

echo '!!!filter: dissonant' > $TMP/dissonant-analysis.krn
cat $TMP/filtered.krn | extract -i '**kern' >> $TMP/dissonant-analysis.krn

verovio $TMP/dissonant-analysis.krn  -t mei -o $TMP/dissonant-analysis.mei
java -cp /usr/share/java/saxon/saxon-he.jar net.sf.saxon.Transform -s:$TMP/dissonant-analysis.mei "-xsl:$SCRIPTDIR/fix_mei_measure_ns.xsl" -o:$TMP/dissonant-analysis-with-n.mei

python "$SCRIPTDIR/merge_harm.py" "$TMP/clean.mei" "$TMP/dissonant-analysis-with-n.mei" "$2"
if [ $? != 0 ]; then
  echo "error merging harm elements. Kept temporal files at $TMP"
  exit 1
fi

#rm -rf $TMP
echo "New file with merged analysis as <harm> elements: '$2'"

TMP=`mktemp -d`
SCRIPTDIR=`dirname "$0"`
MEI_NS="http://www.music-encoding.org/ns/mei"

echo "Performing dissonant analysis for file $1"

cp "$1" "$TMP/backup.mei"

xmlstarlet ed  -P -N mei="$MEI_NS"  -d '//mei:app[@type="dissonant_analysis" or mei:rdg[@type="dissonant_analysis"]]' "$1" | xmlstarlet ed  -P -N mei="$MEI_NS"  -d '//mei:harm' > $TMP/clean.mei
python $SCRIPTDIR/filter_editorials.py $TMP/clean.mei > $TMP/filtered.mei
echo "clean MEI without editorials at $TMP/filtered.mei"
python3 "$SCRIPTDIR/flatten_staffgrp.py" "$TMP/filtered.mei" "$TMP/filtered_flattened.mei"

# converter21 only ever converts the first <mdiv>, so a score split into
# movements (the coplas a solo of a tono, say) would lose everything past the
# first one. Analyse one mdiv at a time and merge each result into its own.
MDIVS=`xmlstarlet sel -N mei="$MEI_NS" -t -v 'count(//mei:body/mei:mdiv[.//mei:measure])' "$TMP/filtered_flattened.mei"`
[ -z "$MDIVS" ] && MDIVS=0
[ "$MDIVS" -lt 1 ] && MDIVS=1
echo "Analysing $MDIVS mdiv(s)"

BASE="$TMP/clean.mei"
I=1
while [ "$I" -le "$MDIVS" ]; do
	W="$TMP/mdiv-$I"
	# Drop every mdiv but this one; a no-op on a score that has just one.
	xmlstarlet ed -P -N mei="$MEI_NS" -d "//mei:body/mei:mdiv[.//mei:measure][position() != $I]" "$TMP/filtered_flattened.mei" > "$W.mei"

	python3 -m converter21 -f mei -t humdrum "$W.mei" "$W.krn"
	if [ $? != 0 ]; then
		echo "error converting mdiv $I to humdrum. Kept temporal files at $TMP"
		exit 1
	fi

	echo '!!!filter: dissonant' > "$W-dissonant.krn"
	extract -i '**kern' < "$W.krn" >> "$W-dissonant.krn"
	# The clipboard is for pasting into the Verovio Humdrum Viewer, which takes
	# one score at a time: leave the first mdiv there, the polyphonic one.
	if [ "$I" = 1 ] && command -v wl-copy > /dev/null; then
		wl-copy -t text/plain < "$W-dissonant.krn"
	fi

	verovio --mdiv-all -a "$W-dissonant.krn" -t mei -o "$W-analysis.mei"
	python $SCRIPTDIR/filter-mei-dup-ties.py "$W-analysis.mei" --output "$W-analysis-fixed.mei"
	java -cp /usr/share/java/saxon/saxon-he.jar net.sf.saxon.Transform -s:"$W-analysis-fixed.mei" "-xsl:$SCRIPTDIR/fix_mei_measure_ns.xsl" -o:"$W-analysis-with-n.mei"

	python "$SCRIPTDIR/merge_harm.py" "$BASE" "$W-analysis-with-n.mei" "$TMP/merged-$I.mei" --mdiv "$I"
	if [ $? != 0 ]; then
		echo "error merging harm elements for mdiv $I. Kept temporal files at $TMP"
		exit 1
	fi

	BASE="$TMP/merged-$I.mei"
	I=`expr $I + 1`
done

python $SCRIPTDIR/xml_reindent.py "$BASE" -o "$1"

#rm -rf $TMP
echo "New file with merged analysis as <harm> elements: '$1'"

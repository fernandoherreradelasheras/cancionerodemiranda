TMP=`mktemp -d`
SCRIPTDIR=`dirname "$0"`

mkdir $TMP/raw
mkdir $TMP/filtered
mkdir $TMP/stanzas

echo "Performing check lyrics for file $1"
python "$SCRIPTDIR/mei_lyrics_extractor.py" -o $TMP/raw --simple "$1"
for i in $TMP/raw/*.txt; do
  name=`basename "$i"`
  cat "$i" | python "$SCRIPTDIR/remove_repetitions_from_voice.py" > "$TMP/filtered/$name"
  python "$SCRIPTDIR/stanza_breaker.py" "$TMP/filtered/$name" > "$TMP/stanzas/$name"
done

python "$SCRIPTDIR/voice_compare.py" --pattern "*.txt" "$TMP/stanzas" 

#rm -rf $TMP

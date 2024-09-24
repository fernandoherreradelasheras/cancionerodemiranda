#FILE="tonos/01_-_Un_imposible_me_mata/01_-_Un_imposible_me_mata-music-T.mei"
#TEXT="tonos/01_-_Un_imposible_me_mata/01_-_Un_imposible_me_mata-text.txt"

FILE="$1"
TEXT="$2"
pdfname="$3"




txt_to_svg() {
	TXT="$1"
	append_pos=$2
	starting_line=`grep -n "^$" "$TXT" | cut -f1 -d: | head -1`

	echo '<?xml version="1.0" encoding="UTF-8" standalone="no"?>'
	echo '<svg viewBox="0 0 2100 2970" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg">'
    	echo "<text x=\"50%\" y=\"${append_pos}%\" font-size=\"40\" dy=\"0\">"

	tail -n +$(($starting_line + 1)) $TXT | while read line; do
        	echo "<tspan x=\"50%\" text-anchor=\"middle\" dy=\"1.2em\">$line </tspan>"
	done

    	echo '</text>'
	echo '</svg>'
}

should_append_text() {
	TXT="$1"
	extra_stances=`grep -c "^$" "$TXT"`
	if [ $extra_stances -gt 0 ]; then
		return 1
	else
		retun 0
	fi
}

		

DIR=`mktemp -d`

verovio --breaks-no-widow --unit 8.2 --multi-rest-style auto --mdiv-all -a --mm-output  --min-last-justification 0.0  --mnum-interval 0  --bottom-margin-header 2.5 --page-margin-left 150 --page-margin-right 150 --page-margin-top 150  --page-margin-bottom 150  --header auto --footer encoded --condense auto --breaks smart --breaks-smart-sb 0.01 -o $DIR/output.svg "$FILE"

if should_append_text $TEXT; then
	svgs2pdf -m ${pdfname} -o $DIR $DIR/*.svg
else
	last_page_svg=$DIR/`ls -1rt $DIR | tail -1`
	mv "$last_page_svg" "$DIR/score_last_page.svg"

	append_pos=$((2 + `sh get_svg_bounding_box.sh $DIR/score_last_page.svg`))
	txt_to_svg "$TEXT" $append_pos > "$DIR/text.svg"

	svgs2pdf  -o $DIR $DIR/*.svg
	
	pdftk $DIR/score_last_page.pdf background $DIR/text.pdf output $DIR/output_LAST.pdf 
	pdftk $DIR/output_*.pdf  cat output "${pdfname}"
fi


rm -rf $DIR


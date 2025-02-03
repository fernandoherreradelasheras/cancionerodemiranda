#!/usr/bin/bash

set -e

#Set this to MuseScore binary
MUSE=MuseScore-Studio.AppImage
PRE_RELEASE=1
BASE_URL="https://raw.githubusercontent.com/fernandoherreradelasheras/cancionerodemiranda"

function log() {
	echo "$1" >> $TMP/debug.log
}

function add_image() {
	local dir=$1
	local page=$2
	local caption=$3
	local title=$4

	printf -v k "%03d" $page
	echo "\\begin{figure}[p]"
	if [ ! -z $title ]; then
		echo "\\section*{\centering\LARGE{$title}}"
	fi
	echo "\\caption{$caption}"
	echo "\\makebox[\\linewidth]{"
	echo "\\includegraphics[width=0.95\\linewidth]{facsimil-images/$dir/image-$k.jpg}"
	echo "}"
	echo "\\end{figure}"
}

function get_init() {
	#echo "\\documentclass[titlepage,hidelinks]{article}"
	echo "\\documentclass[12pt, a4paper, twoside,hidelinks]{article}"
	echo "\\usepackage{iberianpolyphony}"
	echo "\\addcovermanuscriptbackground"

	echo "\\input{header.tex}"
	echo "\\begin{document}"
	echo "\\customtitlepage{\mytitle}"
}
function get_titles() {
	local n="$1"
	local music="$2"
	local text="$3"

	ordinal=$(echo $n | sed -e 's/^0*\([0-9]*\)/\1º/')

	echo "\\def\\mytitle{\\centering \\LARGE Tono ${ordinal}: $title \\\\}"
	echo "\\def\\mymusic{$music}"
	echo "\\def\\mytext{$text}" 
}

function get_version() {
	local rev_count=$(git rev-list --count main -- "$@")

	echo "\\def\\myversion{0.${rev_count}}" 
}

function get_status() {
	local text_transcription=$(echo "$1" | jq ".status_text_transcription" -r)
	local text_validation=$(echo "$1" | jq ".status_text_validation" -r)
	local text_proof_reading=$(echo "$1" | jq ".status_text_proof_reading" -r)
	local music_transcription=$(echo "$1" | jq ".status_music_transcription" -r)
	local music_proof_reading=$(echo "$1" | jq ".status_music_proof_reading" -r)
	local music_validation=$(echo "$1" | jq ".status_music_validation" -r)
	local poetic_study=$(echo "$1" | jq ".status_poetic_study" -r)
	local musical_study=$(echo "$1" | jq ".status_musical_study" -r)

	echo "\\def\\mytexttranscription{$text_transcription}"
	echo "\\def\\mytextproofreading{$text_proof_reading}"
	echo "\\def\\mytextvalidation{$text_validation}"
	echo "\\def\\mymusictranscription{$music_transcription}"
	echo "\\def\\mymusicproofreading{$music_proof_reading}"
	echo "\\def\\mymusicvalidation{$music_validation}"
	echo "\\def\\mypoeticstudy{$poetic_study}"
	echo "\\def\\mymusicalstudy{$musical_study}"

	for status in "$text_transcription" "$text_validation" "$text_proof_reading" "$music_proof_reading" "$music_validation" "$poetic_study" "$musical_study"; do
		if [ "$status" != "completed" ]; then
			echo "\\DraftwatermarkOptions{stamp=true}" 
			break
		fi
	done
}

function txt_to_tex() {
	local file="$1"
	cat "$file" | while read line; do
		if [ -z "${line}" ]; then
			echo '!'
		else
			echo " "
			echo -e -n "$line \\\\\\\\"
		fi
	done
	echo '!'
}


function get_text_part() {
	local dir="$1"
	local text_transcription="$2"
	local text_comments="$3"

	echo "\\section*{\\centering\\LARGE{Texto poético}}"
	echo "\\begingroup"
	echo "\\centering"
	echo "\\Large"
	echo "\\itshape"
	echo "\\settowidth{\\versewidth}{xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx}"
	echo "\\setlength{\\vrightskip}{-3em}"

	echo "\\begin{verse}[\\versewidth]"
	echo "\\poemlines{5}"
	length=$(echo "$text_transcription" | jq 'length' -r)
	if [ ! -z "$length" ] && [ "$length" -eq 1 ]; then
		file=$(echo "$text_transcription" | jq '.[0].file' -r)
		txt_to_tex "$dir/$file"
	else
		for i in `seq 0 $(($length - 1))`; do
			type=$(echo "$text_transcription" | jq ".[$i].type" -r)
			file=$(echo "$text_transcription" | jq ".[$i].file" -r)
			if [ $type == "estribillo" ]; then
				echo "\\flagverse{\\textnormal{Estribillo}}" 
			elif [ $type == "coplas" ]; then
				echo "\\flagverse{\\textnormal{Coplas}}" 
			fi
			txt_to_tex "$dir/$file"
		done
	fi
	echo "\\poemlines{0}"
	echo "\\end{verse}"
	echo "\\endgroup"


	if [ -f $text_comments ]; then
		echo "\\subsection*{Notas al texto poético}"
		cat $text_comments
	fi
}

function count_lines_in_overlay() {
        local file="$1"
	local section="$2"
	if [ ! -f "$file" ]; then
		return
	fi

	log "Checking lines for section $section in file $file" >> $TMP/debug.log

	ANNOTATIONS_COUNT=$(grep  "^%append_to_score_section=" "$file"  | wc -l)
	if [ $ANNOTATIONS_COUNT -gt 0 ]; then
		# Get all paragraphs with a annotation matching our section. Change empty line x2
		sed -e '/./{H;$!d;}' -e "x;/\n%append_to_score_section=${section}\n/"'!'"d;s/^\n%append_to_score_section=${section}\n/\n\n/" "$file" | wc -l
	else 
		# If no annotations, coplas section gets all after first one: Remove comments, skip up to first empty line and then newlines x2
		grep  -v "^%"  "$file" | sed -n '/^$/,$p'  | sed -e 's/^$/\n/' | wc -l
	fi
}

function insert_title_in_mei() {
	local mei_file="$1"
	local section="$2"

	local heading_section="${section}_heading"
	local title=$(echo "   ${section^}" | tr "_" " " )

	local path="//mei:section[@label=\"${section}\"]"
	xmlstarlet ed -L -N  mei="http://www.music-encoding.org/ns/mei" -i "$path"  -t elem -n "section label=\"${heading_section}\"" "$mei_file"

	path="//mei:section[@label=\"${heading_section}\"]"
	xmlstarlet ed -L -N  mei="http://www.music-encoding.org/ns/mei" -s "$path" -t elem -n "div type=\"heading\"" "$mei_file" 

	path+="/mei:div"
	xmlstarlet ed -L -N  mei="http://www.music-encoding.org/ns/mei" -s "$path" -t elem -n "rend" -v "$title" "$mei_file"

	path+="/mei:rend"
	xmlstarlet ed -L -N  mei="http://www.music-encoding.org/ns/mei" -i "$path" -t attr -n "fontsize" -v "large" "$mei_file"
	xmlstarlet ed -L -N  mei="http://www.music-encoding.org/ns/mei" -i "$path" -t attr -n "fontweight" -v "bold" "$mei_file"
}


function get_music_part() {
	local dir="$1"
	local music_transcription="$2"
	local text_transcription="$3"
	local music_comments="$4"
	local title="$5"
	local order="$6"
	local poet="$7"
	local composer="$8"
	local mei_unit="$9"

	if [ -z "$music_transcription" ]; then
		return
	fi

	if [ ! -z $mei_unit ]; then
		MEI_UNIT=$mei_unit
	else
		MEI_UNIT=8.0
	fi

	# Fix mei exported from musescore
	cat "$music_transcription" | sed -e 's/mei-basic/mei-all/g' | sed -e 's/5\.0+basic/5.0/g' | xmlstarlet ed -L -N  mei="http://www.music-encoding.org/ns/mei" -s "//mei:score/mei:scoreDef" -t elem -n "pgHead" > $TMP/tmp1.mei

	# Generate header from metadata using xslt
	ordinal=$(echo $order | sed -e 's/^0*\([0-9]*\)/\1º/')
	if [ "$poet" = "Anónimo" ]; then meipoet="[Anónimo]"; else meipoet="$poet"; fi
	if [ "$composer" = "Anónimo" ]; then meicomposer="[Anónimo]"; else meicomposer="$composer"; fi
	xsltproc --stringparam title "$title" --stringparam subtitle "$ordinal Tono del Cancionero de Miranda" --stringparam poet "$meipoet" --stringparam composer "$meicomposer" pgHead.xsl $TMP/tmp1.mei > $TMP/tmp2.mei

	total_sections=$(echo "$text_transcription" | jq -r ". | length")
	coplas_filename=$(echo "$text_transcription" | jq -r ".[] | select( .type == \"coplas\" ).file")
	single_filename=$(echo "$text_transcription" | jq -r ".[] | select( .type == \"single\" ).file")
	estribillo_filename=$(echo "$text_transcription" | jq -r ".[] | select( .type == \"estribillo\" ).file")
	if [ ! -z "$coplas_filename" ]; then
		extra_coplas="$dir/$coplas_filename"
	elif [ ! -z "$single_filename" ]; then
		extra_coplas="$dir/$single_filename"
	fi

	score_sections_to_append=$(grep "^%append_to_score_section=" ${extra_coplas} | cut -d= -f2 | sort | uniq)
	if [ -z "$score_sections_to_append" ]; then
		score_sections_to_append=('coplas')
	fi


	log "sections: $score_sections_to_append"
	for section in ${score_sections_to_append[@]}; do 
		if [ "$section" = "none" ]; then
			continue
		fi
		log "Checking section: $section"
		lines=$(count_lines_in_overlay "$extra_coplas" "$section")
		log "Lines in section $section : $lines"
		# TODO: instead of using this aproximation we whould  fixed sized we sould measure the size of
		#       the rendered text and expand the placeholder accorfing to it
		if [ $lines -gt 16 ]; then
			XSLT=coplas-placeholder-long.xsl
		else
			XSLT=coplas-placeholder.xsl
		fi

		# section with a title preceding the music only if there are more sections
		if [ $total_sections -gt 1 ]; then
			insert_title_in_mei $TMP/tmp2.mei "$section"
		fi

		# section for the text with the remaining coplas after the music
		injected_section="${section}_extra_text"
		log "new section to inject: $new_section"
		xmlstarlet ed -L -N  mei="http://www.music-encoding.org/ns/mei" -a "//mei:section[@label=\"$section\"]" -t elem -n "section label=\"${injected_section}\"" $TMP/tmp2.mei
		java -cp /usr/share/java/saxon/saxon-he.jar net.sf.saxon.Transform -s:$TMP/tmp2.mei -xsl:$XSLT -o:$TMP/tmp3.mei "section=$injected_section"
		mv $TMP/tmp3.mei $TMP/tmp2.mei
	done


	# Add always the estribillo title
	if [ ! -z "$estribillo_filename" ]; then
		insert_title_in_mei $TMP/tmp2.mei "estribillo"
	fi

	# Render the mei file with the placeholders
	mv $TMP/tmp2.mei $TMP/final.mei
	sh ./mei_to_pdf.sh $MEI_UNIT $TMP/final.mei $TMP/music.pdf > /dev/null


	# Now inject the text in any placer holder we might have added
	for section in ${score_sections_to_append[@]}; do 
		if [ "$section" = "none" ]; then
			continue
		fi
		# Locate the placeholder in the score pdf and delete it
		injected_section="${section}_extra_text"
		pages_and_offset=`python find_and_remove_place_holder.py "$injected_section" $TMP/music.pdf`

		log "rendering text for section $section : $pages_and_offset"

		page=`echo $pages_and_offset | cut -f1 -d:`
		offset=`echo $pages_and_offset | cut -f2 -d:`
		pages=`echo $pages_and_offset | cut -f3 -d:`

		# Render a pdf with the text rendered at the position where the placeholder was in the score page
		outputname="stanzas_${section}"
		python build_verses_overlay.py "$offset" "$extra_coplas" "$section"  > "$TMP/${outputname}.tex"
		pdflatex  -interaction=batchmode -output-directory=$TMP "$TMP/${outputname}.tex" > /dev/null

		# Extract the page from the score pdf where we want to overlay the pdf with the coplas 
		pdftk $TMP/music.pdf cat $page output $TMP/music_page_to_overlay.pdf > /dev/null

		# Do the overlay operation
		pdftk $TMP/music_page_to_overlay.pdf background "$TMP/${outputname}.pdf" output $TMP/music_with_stanzas.pdf > /dev/null

		# Build back the final music pdf
		if [ $page == 1 ]; then
			RANGE="B"
			if [ $pages -gt 2 ]; then
				RANGE+=" A2-end"
			elif [ $pages -gt 1 ]; then
				RANGE+=" A2"
			fi
		elif [ $page == 2 ]; then
			RANGE="A1 B"
			if [ $pages -gt 3 ]; then
				RANGE+=" A3-end"
			elif [ $pages -gt 2 ]; then
				RANGE+=" A3"
			fi
		elif [ $pages == $page ]; then
			RANGE="A1-$(($page - 1)) B"
		else
			RANGE="A1-$(($page - 1)) B A$(($page + 1))"
			if [ $pages -gt $(($page + 1)) ]; then
				RANGE+="-end"
			fi
		fi

		pdftk A=$TMP/music.pdf B=$TMP/music_with_stanzas.pdf cat $RANGE output $TMP/music-updated.pdf > /dev/null
		mv $TMP/music-updated.pdf $TMP/music.pdf
	done


	echo "\\section*{Edición musical}"
	if [ $INDIVIDUAL = "true" ]; then
		    echo "\\input{criterios-musicales.tex}" 
	fi
	if [ -f $music_comments ]; then
		cat $music_comments
	fi
	echo "\\includepdf[pages=-]{music.pdf}"
}

function get_images() {
	local dir=$1
	local pages="$2"
	local caption=$3
	local title=$4

	if [ -n "$pages" ]; then
		for page in $pages; do
				N=$(($page - 1))
				add_image $dir $N "$caption" "$title"
				caption=""
				title=""
		done
	fi
}

function get_facsimil() {
	local S1=$1
	local S2=$2
	local T=$3
	local G=$4

	get_images S1 "$S1" "Facsimil tiple 1" "Facsimiles"
	get_images S2 "$S2" "Facsimil tiple 2"
	get_images T "$T" "Facsimil tenor"
	get_images G "$G" "Facsimil guión"
}



function generate_tono() {
	local dir="$1"
	local count=$2


	json=$(cat $dir/def.json)
	S1=$(echo $json | jq '.s1_pages | join(" ")' -r)
	S2=$(echo $json | jq '.s2_pages | join(" ")' -r)
	T=$(echo $json | jq '.t_pages | join(" ")' -r)
	G=$(echo $json | jq '.g_pages | join(" ")' -r)
	intro=$(echo $json | jq '.introduction | select (.!=null)' -r)
	poet=$(echo $json | jq '.text_author' -r)
	composer=$(echo $json |jq '.music_author' -r)
	title=$(echo $json | jq '.title' -r)
	text_transcription=$(echo $json | jq '.text_transcription | select (.!=null)' -r)
	text_comments=$dir/$(echo $json |jq '.text_comments_file | select (.!=null)' -r)
	music_file=$(echo $json |jq '.mei_file | select (.!=null)' -r)
	if [ ! -z "$music_file" ] && [ -f "$dir/$music_file" ]; then
		music_transcription="$dir/$music_file"
	else
		music_transcription=""
	fi
	music_unit=$(echo $json |jq '.mei_unit | select (.!=null)' -r)
	music_comments=$dir/$(echo $json |jq '.music_comments_file | select (.!=null)' -r)

	if [ -n "$poet" ]; then
		text="$poet"
	else
		text="Anónimo"
	fi
	if [ -n "$composer" ]; then
		music="$composer"
	else
		music="Anónimo"
	fi
	printf -v TONO "%02.0f" "$count"

	get_titles $count "$music" "$text" > $TMP/values.tex

	readarray -t gitFiles <<< $(echo "$text_transcription" | jq -r "\"$dir/\" + .[].file")
	if [ -f "$text_comments" ];
		then gitFiles+=($text_comments)
	fi
	if [ -f "$music_transcription" ];
		then gitFiles+=($music_transcription)
	fi
	if [ -f "$music_comments" ];
		then gitFiles+=($music_comments)
	fi
	get_version  "${gitFiles[@]}" >> $TMP/values.tex

	get_status "$json" >> $TMP/values.tex
	if [[ ! -z $PRE_RELEASE ]]; then
		echo "\\def\\prerelease{true}" >> $TMP/values.tex
	fi

	get_init > $TMP/tmp.tex
	if [ ! -z "$intro" ]; then 
		echo "\\section*{\\centering\\LARGE{Introducción}}" >> $TMP/tmp.tex
		cat "${dir}/${intro}" >> $TMP/tmp.tex
	fi
	get_text_part "$dir" "$text_transcription" $text_comments >> $TMP/tmp.tex
	get_music_part "$dir" "$music_transcription" "$text_transcription" "$music_comments" "$title" "$TONO" "$text" "$music" "$music_unit" >> $TMP/tmp.tex

	get_facsimil "$S1" "$S2" "$T" "$G" >> $TMP/facsimil.tex
	echo "\\input{facsimil.tex}" >> $TMP/tmp.tex
	echo "\\clearpage" >> $TMP/tmp.tex

	echo "\\input{acerca.tex}" >> $TMP/tmp.tex

	echo "\\end{document}" >> $TMP/tmp.tex

	mkdir -p output

	pdflatex  -interaction=batchmode -output-directory=$TMP $TMP/tmp.tex && cp $TMP/tmp.pdf "output/${TONO} - ${title}.pdf"

	if [ -f $TMP/final.mei ]; then
		cp $TMP/final.mei "output/${TONO} - ${title}.mei"
		echo "MEI score: \"output/${TONO} - ${title}.mei\""
		pdftk $TMP/tmp.pdf attach_files "output/${TONO} - ${title}.mei" to_page end  output "output/${TONO} - ${title}.pdf"
	else 
		mv $TMP/tmp.pdf "output/${TONO} - ${title}.pdf"
	fi

	echo "PDF file: \"output/${TONO} - ${title}.pdf\""
}


INDIVIDUAL=true

TMP=`mktemp -d`

if [[ $# -eq 1 ]]; then
	if [ -d tonos/"$1"* ]; then
		generate_tono tonos/"$1"* $1
		rm -rf $TMP/* 
	else
		echo "Not such tono: $1"
	fi
else
	count=0
	for dir in tonos/*; do
		count=$(($count + 1))
		echo -e "Building tono #${count} from dir $dir\n"
		generate_tono "$dir" $count
		rm -rf $TMP/* 
	done
fi

#TODO: If not individual, merge all pdfs (and make cover additiong dependant on that)

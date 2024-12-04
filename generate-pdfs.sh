#!/usr/bin/bash

set -e

#Set this to MuseScore binary
MUSE=MuseScore-Studio.AppImage
USE_MEI=1
PRE_RELEASE=1
BASE_URL="https://raw.githubusercontent.com/fernandoherreradelasheras/cancionerodemiranda"

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
	echo "\\documentclass[10pt, a4paper, twoside,hidelinks]{article}"
	echo "\\usepackage{iberianpolyphony}"
	echo "\\addmanuscriptwatermark"

	echo "\\input{header.tex}"
	echo "\\begin{document}"
	echo "\\customtitlepage{\mytitle}"
}
function get_titles() {
	local n="$1"
	local music="$2"
	local text="$3"

	echo "\\def\\mytitle{\\centering \\LARGE Tono ${n}º: $title \\\\}"
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
	if [ "$length" -eq 1 ]; then
		file=$(echo "$text_transcription" | jq '.[0].file' -r)
		txt_to_tex "$dir/$file"
	else
		for i in `seq 0 $(($length - 1))`; do
			type=$(echo "$text_transcription" | jq ".[$i].type" -r)
			file=$(echo "$text_transcription" | jq ".[$i].file" -r)
			echo -n "\\flagverse{$type} " 
			txt_to_tex "$dir/$file"
		done
	fi
	echo "\\poemlines{0}"
	echo "\\end{verse}"
	echo "\\endgroup"


	if [ -f $text_comments ]; then
		echo "\\section*{\centering\Large{Notas a la edición poética}}"
		cat $text_comments
	fi
}

should_append_text() {
        local dir="$1"
        local text_transcription="$2"
        length=$(echo "$text_transcription" | jq 'length' -r)
        if [ "$length" -eq 1 ]; then
                file=$(echo "$text_transcription" | jq '.[0].file' -r)
        else
                file=$(echo "$text_transcription" | jq '.[] |select(.type=="coplas").file' -r)
        fi

        extra_stances=`grep -c "^$" "$dir/$file"`
        if [ $extra_stances -gt 0 ]; then
                echo "$dir/$file"
        fi
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

	rm -f music.pdf
	if [ -f $music_transcription ]; then
		if [ "$USE_MEI" = "1" ]; then
			# Fix mei exported from musescore
			cat "$music_transcription" | sed -e 's/mei-basic/mei-all/g' | sed -e 's/5\.0+basic/5.0/g' | xmlstarlet ed -L -N  mei="http://www.music-encoding.org/ns/mei" -s "//mei:score/mei:scoreDef" -t elem -n "pgHead" > tmp1.mei

			# Generate header from metadata using xslt
			xsltproc --stringparam title "$title" --stringparam order "$order" --stringparam poet "$poet" --stringparam composer "$composer" pgHead.xsl tmp1.mei > tmp2.mei

			# If there are more coplas, append the text in a <div> element 
			append_text_file=$(should_append_text "$dir" "$text_transcription")
			if [ ! -z "${append_text_file}" ]; then
				# Skip first stanza
        			starting_line=`grep -n "^$" "$append_text_file" | cut -f1 -d: | head -1`
				verses=$(tail -n +$(($starting_line + 1)) $append_text_file)
       				java -cp /usr/share/java/saxon/saxon-he.jar net.sf.saxon.Transform -s:tmp2.mei -xsl:coplas.xsl -o:tmp3.mei text="$verses"
				mv tmp3.mei final.mei
			else
				mv tmp2.mei final.mei
			fi

			# render the mei file 
			sh mei_to_pdf.sh final.mei music.pdf > /dev/null
		else
			$MUSE --export-to=music.pdf $music_transcription
		fi
		echo "\\section*{\centering\LARGE{Edición musical}}"
		if [ -f $music_comments ]; then
			cat $music_comments
		fi
		echo "\includepdf[pages=-]{music.pdf}"
	fi
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

function get_mei_link() {
	local meifile="$1"

	rev=`git rev-parse HEAD`
	echo "$BASE_URL/$rev/$meifile"
}

function get_mei_name() {
	local meifile="$1"

	basename "$meifile" | sed -e  's/_/\\_/g'
}





function generate_tono() {
	local dir="$1"
	local count=$2

	rm -f tmp.tex facsimil.tex values.tex final.mei music.pdf tmp1.mei tmp2.mei tmp3.mei

	json=$(cat $dir/def.json)
	S1=$(echo $json | jq '.s1_pages | join(" ")' -r)
	S2=$(echo $json | jq '.s2_pages | join(" ")' -r)
	T=$(echo $json | jq '.t_pages | join(" ")' -r)
	G=$(echo $json | jq '.g_pages | join(" ")' -r)
	intro=$(echo $json | jq '.introduction' -r)
	poet=$(echo $json | jq '.text_author' -r)
	composer=$(echo $json |jq '.music_author' -r)
	title=$(echo $json | jq '.title' -r)
	text_transcription=$(echo $json | jq '.text_transcription' -r)
	text_comments=$dir/$(echo $json |jq '.text_comments_file' -r)
	if [ "$USE_MEI" = "1" ]; then
		music_transcription=$dir/$(echo $json |jq '.mei_file' -r)
	else
		music_transcription=$dir/$(echo $json |jq '.musicxml_file' -r)
	fi
	music_comments=$dir/$(echo $json |jq '.music_comments_file' -r)

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

	get_titles $count "$music" "$text" > values.tex
	get_version "$text_transcription" $text_comments $music_transcription $music_comments >> values.tex
	get_status "$json" >> values.tex
	if [[ ! -z $PRE_RELEASE ]]; then
		echo "\\def\\prerelease{true}" >> values.tex
	fi

	meilink=`get_mei_link  "$music_transcription"`
	meiname=`get_mei_name  "$music_transcription"`
	echo "\\def\\mymeilink{$meilink}" >> values.tex
	echo "\\def\\mymeiname{$meiname}" >> values.tex
	#echo "\\def\\mymeiname{https://google.com/65_-_Del_silencio_de_este_valle.mei/}" >> values.tex

	get_init > tmp.tex
	if [ "$intro" != "null" ]; then 
		echo "\\section*{\\centering\\LARGE{Introducción}}" >> tmp.tex
		cat "${dir}/${intro}" >> tmp.tex
	fi
	get_text_part "$dir" "$text_transcription" $text_comments >> tmp.tex
	get_music_part "$dir" "$music_transcription" "$text_transcription" "$music_comments" "$title" "$TONO" "$text" "$music" >> tmp.tex

	get_facsimil "$S1" "$S2" "$T" "$G" >> facsimil.tex
	echo "\\input{facsimil.tex}" >> tmp.tex
	echo "\\clearpage" >> tmp.tex

	echo "\\input{acerca.tex}" >> tmp.tex

	echo "\\end{document}" >> tmp.tex

	mkdir -p output
	if [ "$USE_MEI" = "1" ]; then
		cp final.mei "output/${TONO} - ${title}.mei"
		echo "MEI score: output/${TONO} - ${title}.mei"
	fi

	#pdflatex -interaction=batchmode tmp.tex && mv tmp.pdf "output/${TONO} - ${title}.pdf"
	pdflatex  tmp.tex && mv tmp.pdf "output/${TONO} - ${title}.pdf"
	echo "PDF file: output/${TONO} - ${title}.pdf"

	#rm -f tmp.* facsimil.tex values.tex music.pdf tmp-with-header.mei
}

if [[ $# -eq 1 ]]; then
	if [ -d tonos/"$1"* ]; then
		generate_tono tonos/"$1"* $1
	else
		echo "Not such tono: $1"
	fi
else
	count=0
	for dir in tonos/*; do
		count=$(($count + 1))
		generate_tono "$dir" $count
	done
fi

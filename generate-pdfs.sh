#!/usr/bin/bash

#Set this to MuseScore binary
MUSE=muse

function add_image() {
	dir=$1
	page=$2
	caption=$3

	printf -v k "%03d" $page
	echo "\\begin{figure}[p]"
	echo "\\caption{$caption}"
	echo "\\makebox[\\linewidth]{"
	echo "\\includegraphics[width=0.95\\linewidth]{facsimil-images/$dir/image-$k.jpg}"
	echo "}"
	echo "\\end{figure}"
}

function get_init() {
	echo "\\documentclass[titlepage,hidelinks]{article}"
	echo "\\input{header.tex}"
	echo "\\begin{document}"
	echo "\\input{title.tex}"
}
function get_titles() {
	n="$1"
	music="$2"
	text="$3"

	echo "\\def\\mytitle{\\centering \\LARGE Cancionero de Miranda\\\\ Tono ${n}º: $title \\\\}"
	echo "\\def\\mymusic{$music}"
	echo "\\def\\mytext{$text}" 
}

function get_version() {
	rev_count=$(git rev-list --count main -- "$@")
	echo "\\def\\myversion{0.${rev_count}}" 
	echo "\\def\\myversioncomment{( en progreso )}" 
}


function get_text_part() {
	text_transcription=$1
	text_comments=$2

	echo "\\section*{\centering\Large{Texto}}"
	cat $text_transcription
	if [ -f $text_comments ]; then
		echo "\\section*{\centering\Large{Notas a la edición poética}}"
		cat $text_comments
	fi
}

function get_music_part() {
	music_transcription=$1
	music_comments=$2

	rm -f music.pdf
	if [ -f $music_transcription ]; then
		$MUSE --export-to=music.pdf $music_transcription
		echo "\includepdf[pages=-]{music.pdf}"
		if [ -f $music_comments ]; then
			echo "\\section*{\centering\Large{Notas a la edición musical}}"
			cat $music_comments
		fi
	fi
}


function get_images() {
	dir=$1
	pages=$2
	caption=$3

	if [ -n "$pages" ]; then
		for page in $pages; do
				N=$(($page - 1))
				add_image $dir $N "$caption"
				caption=""
		done
	fi
}


function get_facsimil() {
	S1=$1
	S2=$2
	T=$3
	G=$4

	get_images S1 "$S1" "Partitura facsimil tiple 1"
	get_images S2 "$S2" "Partitura facsimil tiple 2"
	get_images T "$T" "Partitura facsimil tenor"
	get_images G "$G" "Partitura facsimil guión"
}



readarray -t titles < titulos-unescaped.csv 
readarray -t pages < index-pages-pdfs.csv

count=$((${#pages[@]} - 1))

for i in $(seq 0 $count); do
	echo $i
	page=${pages[$i]}
	TONO=$(echo $page | cut -d, -f1)
        S1=$(echo $page | cut -d, -f2)
        S2=$(echo $page | cut -d, -f3)
        T=$(echo $page | cut -d, -f4)
        G=$(echo $page | cut -d, -f5)
        poet=$(echo $page | cut -d, -f6)
        composer=$(echo $page | cut -d, -f7)
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
	printf -v j "%d" $TONO
	title=${titles[$i]}

	text_transcription=text-transcriptions/${TONO}*-text.tex
	text_comments=text-comments/${TONO}*-text-comments.tex
	music_transcription=music-transcriptions/${TONO}*-music.mscz
	music_comments=music-comments/${TONO}*-music-comments.tex

	get_titles $(($i + 1)) "$music" "$text" > values.tex
	get_version $text_transcription $text_comments $music_transcription $music_comments >> values.tex

	get_init > tmp.tex
	get_text_part $text_transcription $text_comments >> tmp.tex
	get_music_part $music_transcription $music_comments >> tmp.tex

	get_facsimil "$S1" "$S2" "$T" "$G" > facsimil.tex
	echo "\\input{facsimil.tex}" >> tmp.tex

	echo "\\end{document}" >> tmp.tex

	mkdir -p output
	pdflatex tmp.tex && mv tmp.pdf "output/${TONO} - ${title}.pdf"
	rm -f tmp.* facsimil.tex values.tex music.pdf
done

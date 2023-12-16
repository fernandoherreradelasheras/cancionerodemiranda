#!/usr/bin/bash

#Set this to MuseScore binary
MUSE=muse

function add_image() {
	local dir=$1
	local page=$2
	local caption=$3

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
	local n="$1"
	local music="$2"
	local text="$3"

	echo "\\def\\mytitle{\\centering \\LARGE Cancionero de Miranda\\\\ Tono ${n}º: $title \\\\}"
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

function get_text_part() {
	local text_transcription=$1
	local text_comments=$2

	echo "\\section*{\centering\Large{Texto}}"
	cat $text_transcription
	if [ -f $text_comments ]; then
		echo "\\section*{\centering\Large{Notas a la edición poética}}"
		cat $text_comments
	fi
}

function get_music_part() {
	local music_transcription=$1
	local music_comments=$2

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
	local dir=$1
	local pages="$2"
	local caption=$3

	if [ -n "$pages" ]; then
		for page in $pages; do
				N=$(($page - 1))
				add_image $dir $N "$caption"
				caption=""
		done
	fi
}

function get_facsimil() {
	local S1=$1
	local S2=$2
	local T=$3
	local G=$4

	get_images S1 "$S1" "Partitura facsimil tiple 1"
	get_images S2 "$S2" "Partitura facsimil tiple 2"
	get_images T "$T" "Partitura facsimil tenor"
	get_images G "$G" "Partitura facsimil guión"
}



count=0
for dir in tonos/*; do
	count=$(($count + 1))
	json=$(cat $dir/def.json)
  S1=$(echo $json | jq '.s1_pages | join(" ")' -r)
  S2=$(echo $json | jq '.s2_pages | join(" ")' -r)
  T=$(echo $json | jq '.t_pages | join(" ")' -r)
  G=$(echo $json | jq '.g_pages | join(" ")' -r)
  text=$(echo $json | jq '.text_author' -r)
  music=$(echo $json |jq '.music_author' -r)
  title=$(echo $json | jq '.title' -r)
	text_transcription=$dir/$(echo $json |jq '.text_transcription_file' -r)
	text_comments=$dir/$(echo $json |jq '.text_comments_file' -r)
	music_transcription=$dir/$(echo $json |jq '.musicxml_file' -r)
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
	printf -v TONO "%02d" $count

	get_titles $count "$music" "$text" > values.tex
	get_version $text_transcription $text_comments $music_transcription $music_comments >> values.tex
	get_status "$json" >> values.tex

	get_init > tmp.tex
	get_text_part $text_transcription $text_comments >> tmp.tex
	get_music_part $music_transcription $music_comments >> tmp.tex

	get_facsimil "$S1" "$S2" "$T" "$G" > facsimil.tex
	echo "\\input{facsimil.tex}" >> tmp.tex

	echo "\\end{document}" >> tmp.tex

	mkdir -p output
	pdflatex -interaction=batchmode -quiet tmp.tex && mv tmp.pdf "output/${TONO} - ${title}.pdf"
	rm -f tmp.* facsimil.tex values.tex music.pdf
done

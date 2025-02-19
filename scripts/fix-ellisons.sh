#!/usr/bin/bash

INVISIBLE_SEP=" "
SPACE=" "

TARGET="$SPACE"

cat "$1" |  sed -e "s/\([ \t]*\)<syl>\([a-zA-Z]*\)$TARGET\([a-zA-Z]*\)<\/syl>/\1<syl con=\"b\">\2<\/syl>\n\1<syl>\3<\/syl>/g"  | \
	sed -e "s/\([ \t]*\)<syl con=\"\([a-z]\)\">\([a-zA-Z]*\)$TARGET\([a-zA-Z]*\)<\/syl>/\1<syl con=\"b\">\3<\/syl>\n\1<syl con=\"\2\">\4<\/syl>/g"  | \
	sed -e "s/\([ \t]*\)<syl wordpos=\"t\">\([a-zA-Z]*\)$TARGET\([a-zA-Z]*\)<\/syl>/\1<syl con=\"b\" wordpos=\"t\">\2<\/syl>\n\1<syl>\3<\/syl>/g"  | \
	sed -e "s/\([ \t]*\)<syl wordpos=\"i\">\([a-zA-Z]*\)$TARGET\([a-zA-Z]*\)<\/syl>/\1<syl con=\"b\">\2<\/syl>\n\1<syl wordpos=\"i\">\3<\/syl>/g"  | \
	sed -e "s/\([ \t]*\)<syl con=\"\([a-z]\)\" wordpos=\"t\">\([a-zA-Z]*\)$TARGET\([a-zA-Z]*\)<\/syl>/\1<syl con=\"b\" wordpos=\"t\">\3<\/syl>\n\1<syl con=\"\2\">\4<\/syl>/g"  | \
	sed -e "s/\([ \t]*\)<syl con=\"\([a-z]\)\" wordpos=\"i\">\([a-zA-Z]*\)$TARGET\([a-zA-Z]*\)<\/syl>/\1<syl con=\"b\">\3<\/syl>\n\1<syl wordpos=\"i\" con=\"\2\">\4<\/syl>/g"  | \
	sed -e "s/\([ \t]*\)<syl wordpos=\"t\" con=\"\([a-z]\)\">\([a-zA-Z]*\)$TARGET\([a-zA-Z]*\)<\/syl>/\1<syl con=\"b\" wordpos=\"t\">\3<\/syl>\n\1<syl con=\"\2\">\4<\/syl>/g"  | \
	sed -e "s/\([ \t]*\)<syl wordpos=\"i\" con=\"\([a-z]\)\">\([a-zA-Z]*\)$TARGET\([a-zA-Z]*\)<\/syl>/\1<syl con=\"b\">\3<\/syl>\n\1<syl wordpos=\"i\" con=\"\2\">\4<\/syl>/g"  | \
	sed -e "s/\([ \t]*\)<syl con=\"d\" wordpos=\"m\">\([a-zA-Z]*\)$TARGET\([a-zA-Z]*\)<\/syl>/\1<syl con=\"b\" wordpos=\"t\">\2<\/syl>\n\1<syl wordpos=\"i\" con=\"d\">\3<\/syl>/g"  | \
	sed -e "s/\([ \t]*\)<syl wordpos=\"m\" con=\"d\">\([a-zA-Z]*\)$TARGET\([a-zA-Z]*\)<\/syl>/\1<syl con=\"b\" wordpos=\"t\">\2<\/syl>\n\1<syl wordpos=\"i\" con=\"d\">\3<\/syl>/g"  


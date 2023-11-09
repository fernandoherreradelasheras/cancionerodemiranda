
function add_image() {
	printf -v k "%03d" $2
	echo "\\begin{figure}[p]"
	echo "\\caption{$3}"
	echo "\\makebox[\\linewidth]{"
	echo "\\includegraphics[width=0.95\\linewidth]{facsimil-images/$1/image-$k.jpg}"
	echo "}"
	echo "\\end{figure}"
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
	echo "Tono $j con titulo $title tiene pagina $S1 de S1, $S2 de S2, $T de T y $G de G"

	echo "\\def\\mytitle{\\centering \\LARGE Cancionero de Miranda\\\\ Tono $(($i + 1))º: $title \\\\}" > values.tex
	echo "\\def\\mymusic{$music}" >> values.tex
	echo "\\def\\mytext{$text}" >> values.tex


	cp text-transcriptions/${TONO}*.tex tmp.tex

	rm -f figures.tex
	if [ -n "$S1" ]; then
		caption="Tiple 1"
        	for i in $S1; do
        		N=$(($i - 1))
			add_image S1 $N "$caption" >> figures.tex
			caption=""
			
		done
	fi
	if [ -n "$S2" ]; then
		caption="Tiple 2"
        	for i in $S2; do
        		N=$(($i - 1))
			add_image S2 $N "$caption" >> figures.tex
			caption=""
		done
	fi
	if [ -n "$T" ]; then
		caption="Tenor"
        	for i in $T; do
        		N=$(($i - 1))
			add_image T $N "$caption" >> figures.tex
			caption=""
		done
	fi
	if [ -n "$G" ]; then
		caption="Guión"
        	for i in $G; do
        		N=$(($i - 1))
			add_image G $N "$caption" >> figures.tex
			caption=""
		done
	fi
	mkdir -p output
	pdflatex tmp.tex && mv tmp.pdf "output/${TONO} - ${title}.pdf"
	rm -f tmp.* figures.tex values.tex
done

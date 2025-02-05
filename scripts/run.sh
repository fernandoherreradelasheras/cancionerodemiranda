set -e

if [[ $# -ne 1 ]]; then
	echo "Usage: $0 <clean-ids | renumber-measures>"
	exit 1
fi

readarray -t mei_files  <<< $(for d in ../tonos/*; do cat "$d/def.json" | jq -r ".mei_file | select(. != null) | \"$d/\" + . "; done)

if [ "$1" = "clean-ids" ]; then
	for file in "${mei_files[@]}"; do
		python ./clean_mei_ids.py "$file"
	done
elif [ "$1" = "renumber-measures" ]; then
	for file in "${mei_files[@]}"; do
		java -cp /usr/share/java/saxon/saxon-he.jar net.sf.saxon.Transform "-s:$file" -xsl:./fix_mei_measure_ns.xsl -o:./.tmp_output.mei
		sed -e 's/\([^ ]\)\/>$/\1 \/>/g' ./.tmp_output.mei > "$file"
		rm ./.tmp_output.mei
	done
fi

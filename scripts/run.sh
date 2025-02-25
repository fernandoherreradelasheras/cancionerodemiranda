set -e

HEADER1='<?xml version="1.0" encoding="UTF-8"?>'
HEADER2='<?xml-model href="https://music-encoding.org/schema/5.0/mei-basic.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>'
HEADER3='<?xml-model href="https://music-encoding.org/schema/5.0/mei-basic.rng" type="application/xml" schematypens="http://purl.oclc.org/dsdl/schematron"?>'

if [[ $# -ne 2 ]]; then
	echo "Usage: $0 <clean-ids | renumber-measures | fix-ellisons | all> <[file] | -a>"
	exit 1
fi

cmd="$1"
target="$2"

if [ "$target" = "-a" ]; then
	readarray -t mei_files  <<< $(for d in ../tonos/*; do cat "$d/def.json" | jq -r ".mei_file | select(. != null) | \"$d/\" + . "; done)
else
	mei_files=("$target")
fi

script_dir=$(dirname "$0")


for file in "${mei_files[@]}"; do
	if [ "$cmd" = "clean-ids" ] || [ "$cmd" = "all" ]; then
		echo "Cleaning unused ids from $file"
		python "$script_dir/clean_mei_ids.py" "$file"
	fi
	if [ "$cmd" = "renumber-measures" ] || [ "$cmd" = "all" ]; then
		echo "renumbering measures from $file"
		java -cp /usr/share/java/saxon/saxon-he.jar net.sf.saxon.Transform "-s:$file" "-xsl:$script_dir/fix_mei_measure_ns.xsl" -o:./.tmp_output.mei
		mv ./.tmp_output.mei "$file"
	fi
	if [ "$cmd" = "fix-ellisons" ] || [ "$cmd" = "all" ]; then
		echo "Fixing missing syl ellisons from $file"
		python "$script_dir/fix-ellisons.py" "$file"
		FIX_HEADER=1
	fi
	if [ "$cmd" = "add-clefs-app" ] || [ "$cmd" = "all" ]; then
		python "$script_dir/add_app_clefs.py" "$file" ./.tmp_output.mei
		mv ./.tmp_output.mei "$file"
		FIX_HEADER=1

	fi

	if [ ! -z "$FIX_HEADER" ]; then
		echo "$HEADER1" > ./.tmp_output.mei
		echo "$HEADER2" >> ./.tmp_output.mei
		echo "$HEADER3" >> ./.tmp_output.mei
		cat "$file" >> ./.tmp_output.mei
		mv ./.tmp_output.mei "$file"
	fi

	sed -i -e 's/\([^ ]\)\/>$/\1 \/>/g' "$file"

done

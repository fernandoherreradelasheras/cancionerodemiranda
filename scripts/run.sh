set -e


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
		sed -e 's/\([^ ]\)\/>$/\1 \/>/g' ./.tmp_output.mei > "$file"
	fi
	if [ "$cmd" = "fix-ellisons" ] || [ "$cmd" = "all" ]; then
		echo "Fixing missing syl ellisons from $file"
		sh "$script_dir/fix-ellisons.sh" "$file" > ./.tmp_output.mei
		mv ./.tmp_output.mei "$file"
	fi
done

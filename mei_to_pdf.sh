unit="$1"
input="$2"
output="$3"


output_file=$(basename "$output")
output_dir=$(dirname "$output")

DIR=`mktemp -d`


verovio --unit "$unit" --multi-rest-style auto --mdiv-all -a --mm-output  --mnum-interval 0  --bottom-margin-header 2.5 --page-margin-left 150 --page-margin-right 150 --page-margin-top 50 --bottom-margin-header 8 --page-margin-bottom 50 --top-margin-pg-footer 4  --header auto --footer encoded --breaks auto --condense encoded --min-last-justification 1.0 -o $DIR/output.svg "$input"

svgs2pdf -m "$output_file" -o "$output_dir" $DIR/*.svg

if [ -f "$output_dir/output_001.pdf" ] && [ ! -f "$output" ]; then
  mv "$output_dir/output_001.pdf" "$output"
fi

rm -rf $DIR 

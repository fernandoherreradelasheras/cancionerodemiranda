unit="$1"
input="$2"
output="$3"



DIR=`mktemp -d`


verovio --unit "$unit" --multi-rest-style auto --mdiv-all -a --mm-output  --mnum-interval 0  --bottom-margin-header 2.5 --page-margin-left 150 --page-margin-right 150 --page-margin-top 150  --page-margin-bottom 150  --header auto --footer encoded --no-justification --breaks smart --breaks-smart-sb 0.01 --condense none --min-last-justification 1.0 -o $DIR/output.svg "$input"

svgs2pdf -m "$output" $DIR/*.svg

if [ -f output_001.pdf ] && [ ! -f $output ]; then
  mv output_001.pdf "$output"
fi


#rm -rf $DIR 


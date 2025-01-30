unit="$1"
input="$2"
output="$3"



DIR=`mktemp -d`


verovio --unit "$unit" --multi-rest-style auto --mdiv-all -a --mm-output  --min-last-justification 0.8  --mnum-interval 0  --bottom-margin-header 2.5 --page-margin-left 150 --page-margin-right 150 --page-margin-top 150  --page-margin-bottom 150  --header auto --footer encoded --condense auto --no-justification -o $DIR/output.svg "$input"

svgs2pdf -m "$output" $DIR/*.svg

if [ -f output_001.pdf ] && [ ! -f $output ]; then
  mv output_001.pdf "$output"
fi


#rm -rf $DIR 


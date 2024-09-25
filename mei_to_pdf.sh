
input="$1"
output="$2"



DIR=`mktemp -d`


verovio --breaks-no-widow --unit 8.2 --multi-rest-style auto --mdiv-all -a --mm-output  --min-last-justification 0.0  --mnum-interval 0  --bottom-margin-header 2.5 --page-margin-left 150 --page-margin-right 150 --page-margin-top 150  --page-margin-bottom 150  --header auto --footer encoded --condense auto --breaks smart --breaks-smart-sb 0.01 --no-justification -o $DIR/output.svg "$input"

svgs2pdf -m "$output" $DIR/*.svg


rm -rf $DIR 


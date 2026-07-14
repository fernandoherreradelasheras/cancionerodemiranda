
SCRIPTDIR="/home/fer/CdM/repositorio-github/scripts"
TONOSDIR="/home/fer/CdM/repositorio-github/tonos"
TONOSJSON="$TONOSDIR/tonos.json"

for i in {0..76}; do 
  F=`cat "$TONOSJSON" | jq -r ".scores[${i}].meiFile"`
  P=`cat "$TONOSJSON" | jq -r ".scores[${i}].path"`
  if [[ $F != null ]] && [[ ! -z $F ]]; then 
    echo "$TONOSDIR/$P/$F"
  fi
done 


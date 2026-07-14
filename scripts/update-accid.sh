#!/usr/bin/bash

SCRIPTDIR=`dirname "$0"`

xmlstarlet ed -P -L -N mei="http://www.music-encoding.org/ns/mei" -u "//mei:note[mei:accid[@accid='f' and not(@func)]]/@accid" -v "f" -i "//mei:note[mei:accid[@accid='f' and not(@func)]][not(@accid)]" -t attr -n "accid" -v "f" -d "//mei:note[mei:accid[@accid='f' and not(@func)]]/mei:accid[@accid='f' and not(@func)]" "$1"

xmlstarlet ed -P -L -N mei="http://www.music-encoding.org/ns/mei" -u "//mei:note[mei:accid[@accid='s' and not(@func)]]/@accid" -v "s" -i "//mei:note[mei:accid[@accid='s' and not(@func)]][not(@accid)]" -t attr -n "accid" -v "s" -d "//mei:note[mei:accid[@accid='s' and not(@func)]]/mei:accid[@accid='s' and not(@func)]" "$1"

xmlstarlet ed -P -L -N mei="http://www.music-encoding.org/ns/mei" -u "//mei:note[mei:accid[@accid='n' and not(@func)]]/@accid" -v "n" -i "//mei:note[mei:accid[@accid='n' and not(@func)]][not(@accid)]" -t attr -n "accid" -v "n" -d "//mei:note[mei:accid[@accid='n' and not(@func)]]/mei:accid[@accid='n' and not(@func)]" "$1"

xmlstarlet ed -P -L -N mei="http://www.music-encoding.org/ns/mei" -u "//mei:note[mei:accid[@accid.ges='f' and not(@func)]]/@accid.ges" -v "f" -i "//mei:note[mei:accid[@accid.ges='f' and not(@func)]][not(@accid.ges)]" -t attr -n "accid.ges" -v "f" -d "//mei:note[mei:accid[@accid.ges='f' and not(@func)]]/mei:accid[@accid.ges='f' and not(@func)]" "$1"

xmlstarlet ed -P -L -N mei="http://www.music-encoding.org/ns/mei" -u "//mei:note[mei:accid[@accid.ges='s' and not(@func)]]/@accid.ges" -v "s" -i "//mei:note[mei:accid[@accid.ges='s' and not(@func)]][not(@accid.ges)]" -t attr -n "accid.ges" -v "s" -d "//mei:note[mei:accid[@accid.ges='s' and not(@func)]]/mei:accid[@accid.ges='s' and not(@func)]" "$1"

xmlstarlet ed -P -L -N mei="http://www.music-encoding.org/ns/mei" -u "//mei:note[mei:accid[@accid.ges='n' and not(@func)]]/@accid.ges" -v "n" -i "//mei:note[mei:accid[@accid.ges='n' and not(@func)]][not(@accid.ges)]" -t attr -n "accid.ges" -v "n" -d "//mei:note[mei:accid[@accid.ges='n' and not(@func)]]/mei:accid[@accid.ges='n' and not(@func)]" "$1"



xmlstarlet ed -P -L -N mei="http://www.music-encoding.org/ns/mei" -d "//mei:accid[@accid.ges]" "$1"

sed -i 's/<accid accid="s" func="edit"\/>/<accid accid="s" func="edit" enclose="paren"\/>/g' "$1"
sed -i 's/<accid accid="f" func="edit"\/>/<accid accid="f" func="edit" enclose="paren"\/>/g' "$1"
sed -i 's/<accid accid="n" func="edit"\/>/<accid accid="n" func="edit" enclose="paren"\/>/g' "$1"


python "$SCRIPTDIR/xml_reindent.py" "$1"

xmlstarlet ed -P -L -N mei="http://www.music-encoding.org/ns/mei" -d "//mei:note[not(*) and not(normalize-space())]/text()" "$1"





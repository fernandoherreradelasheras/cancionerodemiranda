#!/usr/bin/bash
filename="$1"

# In Inkscape, the bounding box of all objects is called the *drawing*. 
# The coordinates of the drawing can be obtained by invoking inkscape on 
# the command line with the options `-X`, `-Y`, `-W`, and `-H` (which are 
# the abbreviations for `--query-x`, `--query-y`, `--query-width`, and 
# `--query-height`)
# They can be all invoked at once. 
# Inkscape will return four numbers, in the units of px (normally 96 px=1 inch)

# capture the output of the inkscape invocation and store it in an array
a=(`inkscape -X -Y -W -H $filename`)

x1=${a[0]}
y1=${a[1]}
w=${a[2]}
h=${a[3]}

y_offset_percent=`echo \($y1+$h\)/297 + 1| bc`

# print the result
echo $y_offset_percent


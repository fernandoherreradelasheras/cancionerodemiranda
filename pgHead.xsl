<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:mei="http://www.music-encoding.org/ns/mei">

    <xsl:output method="xml" indent="yes"/>

    <xsl:template match="@* | node()">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()"/>
        </xsl:copy>
    </xsl:template>

  <xsl:template match="mei:pgHead">
    <xsl:element name="pgHead">
                     <rend halign="center" valign="top">
                        <rend type="title" fontsize="250%"><xsl:value-of select="$title"/><lb/></rend>
                        <rend type="subtitle" fontsize="large">Tono <xsl:value-of select="$order"/>º del Cancionero de Miranda</rend>
                     </rend>
                     <rend> <lb/></rend>
                     <rend> <lb/></rend>
                     <rend halign="left" valign="bottom" type="poet">Música: <xsl:value-of select="$composer"/><lb/> <lb/></rend>
                     <rend halign="right" valign="bottom" type="composer">Poesía: <xsl:value-of select="$poet"/><lb/> <lb/></rend>


    </xsl:element>
  </xsl:template>

</xsl:stylesheet>


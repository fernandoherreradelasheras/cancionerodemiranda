<?xml version="1.0"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:mei="http://www.music-encoding.org/ns/mei" xmlns="http://www.music-encoding.org/ns/mei">

    <xsl:param name="text"/>

    <xsl:output method="xml" indent="yes"/>

    <xsl:template match="@* | node()">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()"/>
        </xsl:copy>
    </xsl:template>

  <xsl:template match="mei:div[@type='coplas']">
    <div>
	<rend halign="left" valign="top">
        <lb/>
        <rend fontsize="large"> </rend>
        <lb/>

        <xsl:for-each select="tokenize($text,'\n')">
    		     <rend halign="left" fontsize="125%"> <xsl:value-of select="." /><lb/></rend>
        </xsl:for-each>

        <lb/>
        <rend fontsize="large"> </rend>
        <lb/>
	</rend>
    </div>
  </xsl:template>

</xsl:stylesheet>


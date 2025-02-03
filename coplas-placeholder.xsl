<?xml version="1.0"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:mei="http://www.music-encoding.org/ns/mei" exclude-result-prefixes="mei">

    <xsl:output method="xml" indent="yes"/>

    <xsl:param name="section"/>

    <xsl:template match="@* | node()">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()"/>
        </xsl:copy>
    </xsl:template>

  <xsl:template match="mei:section[@label=$section]">
      <section xmlns="http://www.music-encoding.org/ns/mei">
        <xsl:attribute name="label">
           <xsl:value-of select="$section" />
       </xsl:attribute>
        <div>
	    <rend halign="left" valign="top">
            <lb/>
            <rend fontsize="large">{{ %% <xsl:value-of select="$section"/> %% }}</rend>
            <lb/>
            <rend fontsize="large"> </rend>
            <lb/>
            <rend fontsize="large"> </rend>
            <lb/>
            <rend fontsize="large"> </rend>
            <lb/>
            <rend fontsize="large"> </rend>
            <lb/>
            <rend fontsize="large"> </rend>
            <lb/>
            <rend fontsize="large"> </rend>
            <lb/>
            <rend fontsize="large"> </rend>
            <lb/>
            <rend fontsize="large"> </rend>
            <lb/>
            <rend fontsize="large"> </rend>
            <lb/>
	    </rend>
        </div>
    </section>
  </xsl:template>

</xsl:stylesheet>


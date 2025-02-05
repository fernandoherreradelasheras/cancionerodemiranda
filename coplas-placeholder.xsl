<?xml version="1.0"?>
<xsl:stylesheet version="2.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:mei="http://www.music-encoding.org/ns/mei" exclude-result-prefixes="mei">

    <xsl:output method="xml" indent="yes"/>

    <xsl:param name="section"/>

    <xsl:param name="lines"/>

    <xsl:template match="@* | node()">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()"/>
        </xsl:copy>
    </xsl:template>

    <xsl:template name="add_lines">
        <xsl:param name="lines" select="lines"/>
        <xsl:variable name="remaining_lines" select="$lines - 1"/>
            <lb/>
            <rend fontsize="large"> </rend>
        <xsl:if test="$remaining_lines >= 1">
            <xsl:call-template name="add_lines">
                <xsl:with-param name="lines" select="$remaining_lines"/>
            </xsl:call-template>
        </xsl:if>
    </xsl:template>


    <xsl:template match="mei:section[@label=$section]">
      <section xmlns="http://www.music-encoding.org/ns/mei">
        <xsl:attribute name="label">
           <xsl:value-of select="$section" />
       </xsl:attribute>
        <div>
	    <rend halign="left" valign="top">
                <rend fontsize="large">{{ %% <xsl:value-of select="$section"/> %% }}</rend>
                <xsl:call-template name="add_lines">
                    <xsl:with-param name="lines" select="$lines"/>
                </xsl:call-template>
                <lb/>
                <rend fontsize="large"> </rend>
                <lb/>
                <rend fontsize="large"> </rend>
	    </rend>
        </div>
    </section>
    </xsl:template>

</xsl:stylesheet>


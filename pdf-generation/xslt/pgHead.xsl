<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:mei="http://www.music-encoding.org/ns/mei" xmlns="http://www.music-encoding.org/ns/mei">

    <xsl:output method="xml" indent="yes"/>

    <xsl:template match="@* | node()">
        <xsl:copy>
            <xsl:apply-templates select="@* | node()"/>
        </xsl:copy>
    </xsl:template>

  <xsl:template match="mei:fileDesc">
    <xsl:element name="fileDesc">
          <titleStmt>
            <!-- Preserve the source titleStmt (title, composer, lyricist,
                 respStmt); only add the subordinate title and a default
                 composer/respStmt when the source has none. -->
            <xsl:apply-templates select="mei:titleStmt/mei:title[@type='main']"/>
            <title type="subordinate">Tono <xsl:value-of select="$ordinal"/> del Cancionero de Miranda</title>
            <xsl:choose>
               <xsl:when test="mei:titleStmt/mei:composer">
                  <xsl:apply-templates select="mei:titleStmt/mei:composer"/>
               </xsl:when>
               <xsl:otherwise>
                  <composer><persName role="composer"><xsl:value-of select="$composer"/></persName></composer>
               </xsl:otherwise>
            </xsl:choose>
            <xsl:apply-templates select="mei:titleStmt/mei:lyricist"/>
            <xsl:choose>
               <xsl:when test="mei:titleStmt/mei:respStmt">
                  <xsl:apply-templates select="mei:titleStmt/mei:respStmt"/>
               </xsl:when>
               <xsl:otherwise>
                  <respStmt>
                     <persName xml:id="FHH" role="transcriber">Fernando Herrera de las Heras</persName>
                  </respStmt>
               </xsl:otherwise>
            </xsl:choose>
         </titleStmt>
         <pubStmt>
            <date isodate="2024-12-31T01:58:04"/>
            <publisher>
               <corpName role="publisher">Humano y divino
                  <identifier type="URI">https://humanoydivino.com</identifier>
               </corpName>
            </publisher>
            <availability>
               <useRestrict>In the event that this encoding is subject to copyright protection in any jurisdiction under applicable laws, it is licensed under CC BY-SA 4.0. Otherwise, it's in the public domain</useRestrict>
            </availability>
         </pubStmt>
         <encodingDesc>
            <editorialDecl>
               <segmentation>
                  <p>Se han creado elementos mdiv separados para cada una de las secciones de la obra.</p>
               </segmentation>
               <normalization>
                  <p>Los textos cantados se han normalizado a la ortografía moderna del castellano.</p>
               </normalization>
            </editorialDecl>
         </encodingDesc>
         <sourceDesc>
            <source>
               <bibl>
                  <title>Miscelânea de Tonos "de vários autores, a 4.ª do padre Domingos de Miranda da Costa, capelão cantor da Capela Real</title>
                  <title type="alternative">Cancionero de Miranda</title>
                  <contributor>
                     <persName role="compilator">Domingos de Miranda da Costa</persName>
                  </contributor>
                  <physLoc>
                     <repository>
                        <identifier auth="RISM">P-Ln</identifier>
                        <corpName role="holding institution">
                           <name type="organization">Biblioteca Nacional de Portugal</name>
                        </corpName>
                     </repository>
                     <identifier type="shelfmark">M.M. 4802/1</identifier>
                     <identifier type="shelfmark">M.M. 4802/2</identifier>
                     <identifier type="shelfmark">M.M. 4802/3</identifier>
                  </physLoc>
                  <physLoc>
                     <repository>
                        <identifier auth="RISM">P-Lant</identifier>
                        <corpName role="holding institution">
                           <name type="organization">Arquivo Nacional da Torre do Tombo</name>
                        </corpName>
                     </repository>
                     <identifier type="shelfmark">PT/TT/MUS/L122</identifier>
                  </physLoc>
               </bibl>
            </source>
         </sourceDesc>
    </xsl:element>
  </xsl:template>


  <xsl:attribute-set name="pghead-first">
    <xsl:attribute name="func">first</xsl:attribute>
  </xsl:attribute-set>

  <xsl:attribute-set name="pghead-all">
    <xsl:attribute name="func">all</xsl:attribute>
  </xsl:attribute-set>


  <xsl:template match="mei:score/mei:scoreDef/mei:pgHead">
    <xsl:element name="pgHead" use-attribute-sets="pghead-first">
               <rend halign="center" valign="top">
                  <rend type="title" fontsize="x-large"><xsl:value-of select="$title"/></rend>
                  <lb/>
                  <rend fontsize="large"> </rend>
                  <lb/>
                  <rend type="subtitle" fontsize="large">Tono <xsl:value-of select="$ordinal"/> del Cancionero de Miranda</rend>
                  <lb/>
                  <rend fontsize="large"> </rend>
                  <lb/>
                  <rend fontsize="large"> </rend>
                  <lb/>
               </rend>
               <rend halign="left" valign="bottom">
                  <rend type="poet">Texto: <xsl:value-of select="$poet"/></rend>
               </rend>
               <rend halign="right" valign="bottom">
                  <rend type="composer">Música: <xsl:value-of select="$composer"/></rend>
               </rend>
            </xsl:element>
            <xsl:element name="pgHead" use-attribute-sets="pghead-all">
               <rend halign="left" fontsize="90%">Tono <xsl:value-of select="$ordinal"/>: <xsl:value-of select="$title"/></rend>
               <rend halign="right" fontsize="90%">Cancionero de Miranda</rend>
            </xsl:element>
            <xsl:element name="pgFoot" use-attribute-sets="pghead-all">
               <rend halign="center" fontsize="90%">© 2025 https://humanoydivino.com licensed under CC BY-SA 4.0</rend>
            </xsl:element>
  </xsl:template>




</xsl:stylesheet>


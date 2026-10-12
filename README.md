# Cancionero de Miranda

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23321037.svg)](https://doi.org/10.5281/zenodo.23321037)

<img src="https://github.com/fernandoherreradelasheras/cancionerodemiranda/blob/main/facsimil-images/S1/image-100.jpg?raw=true" width="300" />

## About 
The cancionero de Miranda is a previously unknown polyphonic profane songbook in Spanish compiled around the end of the 17th century at the Portuguese Roya Chapel. For a detailed description and presentation of the cancionero see the article:
[El cancionero de Miranda](http://hdl.handle.net/10261/339181)

## Repository
This repository is the playground for the cancionero de Miranda study and transcription work in progress.

The encoding conventions of the MEI files — sources, organic, clefs, critical apparatus, poem and the tooling that checks them — are documented in [GUIDELINES.md](GUIDELINES.md).

So far we have completed only an inital raw transcription of the texts at [text-transcriptions](text-transcriptions/)

The script [generate-pdfs.sh](generate-pdfs.sh) generates a pdf for each of the tonos in the Cancionero the will include:
* Text transcription (in progress)
* Text study (not started)
* Music transcription (not started)
* Music study (not started)
* Facsimile edition of the original scores (done)

If you are not planning to contribute to this work and just want to get the music you can just grab the pdfs generated from the latest release at [releases](https://github.com/fernandoherreradelasheras/cancionerodemiranda/releases/)

## Experimental score viewer
The experimental [score viewer](https://cdm.humanoydivino.com/) renders the in-progress musical transcriptions using the [verovio](https://www.verovio.org/index.xhtml) toolkit is a responsive and customizable view directly on your browser. It also can generate a engraved pdf with the transcription.

We will be experimenting with different features unlocked by using the MEI score format (selective display of annotations and comments, variants, automatic transposition, etc...)

## License

- Music and text transcriptions: public domain; where this is not applicable,
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Introductions, critical notes and study: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- Code of the online edition (`web-app/`, `scripts/`, `pdf-generation/`): [GPL-3.0](LICENSE).
- Facsimiles of the Biblioteca Nacional de Portugal (M.M. 4802/1-2, M.M. 4803): public domain
  ([Public Domain Mark](https://creativecommons.org/publicdomain/mark/1.0/)).
- Facsimiles of the Arquivo Nacional Torre do Tombo (PT/TT/MUS/L122): © Arquivo Nacional Torre do Tombo,
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Each release of the edition is archived in Zenodo. To cite it, use the DOI shared by all versions,
[10.5281/zenodo.23321037](https://doi.org/10.5281/zenodo.23321037), or see [CITATION.cff](CITATION.cff).

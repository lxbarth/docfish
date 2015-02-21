# Docfish example site

Example site using the Docfish site generator.

    TODO: turn this into a test fixture, get a nicer example.

## Build

Build by running docfish's `node index.js` in directory. This will create a directory `_site/` with the fully built web site.

## Tour

### A document

A document is a simple markdown document. Docfish will recognize the first top level header (`#`) as the overall title of the document.

    cat en/01-introduction.md
    # Introduction

    ## About this document

    Lorem ipsum...

The filename controls the path under which the document is accessible from the web, but leading numbers and file extensions are ignored:

    /en/01-introduction.md

Will turn into:

    http://example.com/en/introduction/

### Root directory:

    ls -l
    _site      # generated web site
    _templates # templates used to generate web site
    en         # English version
    es         # Spanish version

These directories are convention, all non-content Docfish specific directories are prefixed with a an underscore, all content directories are organized by language code.

### Document directories

All documents are organized by language:

    ls -l en/ es/
    en/:
    002-map-features.md
    01-introduction.md
    01-introduction.teaser.md
    index.md
    unknown.txt

    es/:
    01-introduccion.md
    02-caracteristicas.md
    03-other.html
    index.md
    justhtml.html

Docfish recognizes any text files in language directories. It will interpret any file as an HTML file with exception of .md file which it recognizes as markdown file and renders into HTML before templating. Docfish will use the optional number at the beginning of a filename to identify translations. So for instance `01-introduction.md` is the translation of `01-introduccion.md`. Docfish will ignore any directories in a language directory. So: no nesting.

### Template directories

    ls -l _templates/
    doc.html
    site.html

There are only two templates for the site: the overall HTML site template (`site.html`) and the document template (`doc.html`).

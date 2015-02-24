var fs = require('fs');
var _ = require('underscore');
var marked = require('marked');
var cfg = {
    siteDir: '_docfish/_site'
};

// Known languages
cfg.languages = JSON.parse(fs.readFileSync(__dirname + '/languages.json'));

// Templates
var templates = {
    doc: _.template(fs.readFileSync('_docfish/templates/doc.html', 'UTF-8')),
    site: _.template(fs.readFileSync('_docfish/templates/site.html', 'UTF-8'))
};

// Create a path array for a given language + file name
var path = function(ln, filename) {
    if (filename.indexOf('index.') == 0) return [ln];
    var m = filename.match(/(\d*-).*/);
    if (m) {
        filename = filename.substr(m[1].length);
    }
    var m = filename.match(/(.*)\.[html|htm|md]/); // todo: broken
    if (m && m.length > 0) return [ln, m[1]];
    return [ln, filename];
};

// Create a permalink from a path.
var permalink = function(path) {
    return '/' + path.join('/') + '/';
};

// Create a directory path.
var mkDirTree = function(path) {
    var current = [];
    for (var i = 0; i < path.length; i++) {
        current.push(path[i]);
        if (fs.existsSync(current.join('/'))) continue;
        fs.mkdirSync(current.join('/'));
    }
};

// Get the document id based on the filename.
var id = function(filename) {
    var m = filename.match(/(\d*)-.*/);
    if (m) return parseInt(m[1]);
    if(filename.indexOf('index.') == 0) return 0;
    return -1;
};

// rm -r
var rmDirSync = function(path) {
    if( fs.existsSync(path)) {
        fs.readdirSync(path).forEach(function(file,index) {
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                rmDirSync(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

// Build a document given its language and filename.
var buildDoc = function(ln, filename) {
    var content = fs.readFileSync([ln, filename].join('/'), 'utf8');
    var title = content.match(/^# (.*?)$/m);
    var p = path(ln, filename);
    if (filename.match(/\.md$/)) {
        content = marked(content);
    }
    return {
        lang: ln,
        id: id(filename),
        filename: filename,
        path: p,
        permalink: permalink(p),
        title: (title ? title[1] : ''),
        content: content,
        translations: []
    };
};

// Build all documents
var buildDocs = function() {
    var docs = {};
    _.chain(fs.readdirSync('.'))
        .intersection(Object.keys(cfg.languages))
        .each(function(ln) {
            docs[ln] = [];
            _(fs.readdirSync(ln)).each(function(filename) {
                docs[ln].push(buildDoc(ln, filename));
            });
        });
    // Link translations
    var langs = Object.keys(docs);
    _(langs).each(function(lang) {
        _(docs[lang]).each(function(doc) {
            (doc.id != -1) && _(langs).each(function(lang) {
                _(docs[lang]).find(function(d) {
                    if (doc.id == d.id && doc.lang != d.lang) {
                        doc.translations.push(d);
                    }
                });
            });
        });
    });
    return docs;
};

// Build and output site
var outputSite = function(docs) {
    fs.existsSync(cfg.siteDir) && rmDirSync(cfg.siteDir);
    fs.mkdirSync(cfg.siteDir);
    _(docs).each(function(docs, lang) {
        _(docs).each(function(doc) {
            // Render doc.
            var links = [];
            _(doc.translations).each(function(t) {
                links.push({permalink: t.permalink,
                    lang: t.lang,
                    langName: cfg.languages[t.lang]}
                );
            });
            doc.content = templates.doc({content: doc.content, translationLinks: links});

            // Render and write full HTML page.
            var path = [cfg.siteDir].concat(doc.path);
            mkDirTree(path);
            var filepath = path.join('/') + '/index.html';
            fs.writeFileSync(
               filepath,
               templates.site(doc),
               'utf8'
               );
        });
    });
};

// Build site
var build = function() {
    outputSite(buildDocs());
};

module.exports = {
    build: build
};

var fs = require('fs');
var _ = require('underscore');
var marked = require('marked');

// TODO: make overrideable
var cfg = {
    siteDir: '_docfish/_site',
    defaultLang: 'en'
};

// Known languages
cfg.languages = JSON.parse(fs.readFileSync(__dirname + '/languages.json'));

// Templates
var templates = {
    page: _.template(fs.readFileSync('_docfish/_templates/page.html', 'UTF-8')),
    toc: _.template(fs.readFileSync('_docfish/_templates/toc.html', 'UTF-8')),
    redirect: _.template(fs.readFileSync(__dirname + '/redirect.html', 'UTF-8'))
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

// Document object containing all document data.
function Doc(ln, filename) {
    var content = fs.readFileSync([ln, filename].join('/'), 'utf8');
    var title = content.match(/^#\s*(.*?)$/m);
    var p = path(ln, filename);
    return {
        lang: ln,
        id: id(filename),
        filename: filename,
        path: p,
        permalink: permalink(p),
        title: (title ? title[1] : ''),
        content: content
    };
};

// Document collection to track all available docs.
var Docs = function() {};
Docs.prototype = new Array;
Docs.prototype.languages = function() {
    return _(this).chain().pluck('lang').uniq().value();
};
Docs.prototype.translations = function(doc) {
    var translations = [];
    if (doc.id == -1) return;
    _(this).each(function(d) {
        if (doc.id == d.id) {
            translations.push(d);
        }
    });
    return _(translations).sortBy(function(d) { return d.lang; });
};
Docs.prototype.assign = function(values) {
    while (this.pop()) {};
    var docs = this;
    _(values).each(function(v) {docs.push(v); });
};
Docs.prototype.sort = function() {
    this.assign(_(this).sortBy(function(doc) { return doc.id; }));
    return this;
};
Docs.prototype.filter = function(key, value) {
    return _(this).filter(function(doc) {
        return doc[key] == value;
    });
};

// Load all documents
var loadDocs = function() {
    var docs = new Docs();
    _.chain(fs.readdirSync('.'))
        .intersection(Object.keys(cfg.languages))
        .each(function(ln) {
            _(fs.readdirSync(ln)).each(function(filename) {
                docs.push(new Doc(ln, filename));
            });
        });
    return docs;
};

// Build and output site
var outputSite = function(docs) {
    fs.existsSync(cfg.siteDir) && rmDirSync(cfg.siteDir);
    fs.mkdirSync(cfg.siteDir);

    // Write redirect to default language.
    mkDirTree([cfg.siteDir]);
    var filepath = cfg.siteDir + '/index.html';
    fs.writeFileSync(
       filepath,
       templates.redirect({redirect: '/' + cfg.defaultLang}),
       'utf8'
       );

    // TODO: Copy non _ prefixed files and directories in _docfish into _docfish/_site

    // Build table of contents and site titles.
    var siteTitles = {};
    var tocs = {};
    _(docs.sort().languages()).each(function(lang) {
        var d = docs.filter('lang', lang);
        siteTitles[lang] = d[0].title;
        tocs[lang] = templates.toc({docs: d.slice(1), lang: lang});
    });

    _(docs).each(function(doc) {
        // Assemble page content.
        var content = _.template(doc.content)({toc: tocs[doc.lang]});
        if (doc.filename.match(/\.md$/)) {
            // We pull title off of index.md (doc.id == 0) as it's the site title.
            if (doc.id == 0) {
                content = content.replace(/^(#.*?)$/m, '');
            }
            // TODO: encodes HTML where it shouldn't
            content = marked(content);
        }
        var page = _.defaults({
            content: content,
            translations: docs.translations(doc),
            siteTitle: siteTitles[doc.lang],
            cfg: cfg
        }, doc);

        // Render and write full HTML page.
        var path = [cfg.siteDir].concat(doc.path);
        mkDirTree(path);
        var filepath = path.join('/') + '/index.html';
        fs.writeFileSync(
           filepath,
           templates.page(page),
           'utf8'
           );
    });
};

// Build site
var build = function() {
    outputSite(loadDocs());
};

module.exports = {
    build: build
};

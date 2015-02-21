var fs = require('fs');
var _ = require('underscore');
var marked = require('marked');

// Known languages
var languages = JSON.parse(fs.readFileSync(__dirname + '/languages.json'));

// Templates
var templates = {
    doc: _.template(fs.readFileSync('_templates/doc.html', 'UTF-8')),
    site: _.template(fs.readFileSync('_templates/site.html', 'UTF-8'))
};

// Create a permalink array for a given language + file name
var permalink = function(ln, filename) {
    if (filename.indexOf('index') != -1) return [ln];
    var m = filename.match(/(\d*-).*/);
    if (m) {
        filename = filename.substr(m[1].length);
    }
    var m = filename.match(/(.*)\.[html|htm|md]/); // todo: broken
    if (m && m.length > 0) return [ln, m[1]];
    return [ln, filename];
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
    if (filename.match(/\.md$/)) {
        content = marked(content);
    }
    content = templates.doc({content: content});
    var title = content.match(/^# (.*?)$/m);
    return {
        lang: ln,
        filename: filename,
        permalink: permalink(ln, filename),
        title: (title ? title[1] : ''),
        content: content
    };
};

// Build all documents
var buildDocs = function() {
    var docs = [];
    _.chain(fs.readdirSync('.'))
        .intersection(Object.keys(languages))
        .each(function(ln) {
            docs[ln] = [];
            _(fs.readdirSync(ln)).each(function(filename) {
                docs[ln].push(buildDoc(ln, filename));
            });
        });
    return docs;
}

// Build and output site
var outputSite = function(docs) {
    fs.existsSync('_site') && rmDirSync('_site');
    fs.mkdirSync('_site');
    _(Object.keys(docs)).each(function(lang) {
        _(docs[lang]).each(function(doc) {
            var path = ['_site'].concat(doc.permalink);
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
outputSite(buildDocs());

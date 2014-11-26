if (process.argv.length < 4) {
    console.log ('usage: node ' + process.argv[1] + ' <glyph-enc.json> <bundle.zip>');
    process.exit (1);
}

var glyphpath = process.argv[2];
var bundlepath = process.argv[3];

var warn_missing_glyphs = true;

var fs = require ('fs');
var util = require ('util');
var path = require ('path');


// Load the information for encoding glyphs

var jdata = fs.readFileSync (glyphpath);
var glyphenc = JSON.parse (jdata);
var glyph_name_to_id = {};

for (var i = 0; i < glyphenc.names.length; i++)
    glyph_name_to_id[glyphenc.names[i]] = i;


// Load the bundle

var raf = new RandomAccessFile (bundlepath);
var zr = new ZipReader (raf.read_range_ab.bind (raf), raf.size ());
var bundle = new Bundle (zr);


// Get list of PFB files to compile

var fontinfo = bundle.get_contents_json ('wtfontdata.json');
var pfbs = {};

for (var item in fontinfo.font2pfb) {
    if (!fontinfo.font2pfb.hasOwnProperty (item))
	continue;

    pfbs[fontinfo.font2pfb[item]] = true;
}


// Compile away ...

function for_each_glyph (font, callback) {
    for (var i = 0; i < font.charstrings.length; i++) {
	var gname = font.charstrings[i].glyphName;
	if (gname == '.notdef' || gname == '.null')
	    continue;

	var gid = glyph_name_to_id[gname];
	if (typeof gid !== 'number') {
	    if (warn_missing_glyphs)
		console.warn ('warning: no registered ID number for glyph name ' + gname);
	    continue;
	}

	var js = [];
	FontRendererFactory.compileCharString (font.charstrings[i].charstring, js, font)
	callback (gname, gid, js);
    }
}


console.log ('var compiled_fonts = {');

for (var pfb in pfbs) {
    if (!pfbs.hasOwnProperty (pfb))
	continue;

    var data = bundle.get_contents_ab (pfb);
    var fontdata = new Stream (data, 0, data.byteLength, {});

    var props = {
	loadedName: pfb,
	type: 'Type1',
	differences: [],
	defaultEncoding: [],
	bbox: [0, 0, 1, 1], // Seems to be needed, but doesn't matter for us
    };

    var font = new Type1Font (pfb, fontdata, props);

    console.log ('"' + pfb + '": {');
    for_each_glyph (font, function (gname, gid, lines) {
	console.log (gid + ': function (c) { // ' + gname);
	console.log (lines.join ('\n'));
	console.log ('},');
    });
    console.log ('},');
}

console.log ('};');

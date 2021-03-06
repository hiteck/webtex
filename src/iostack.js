// Copyright 2014 Peter Williams and collaborators.
// Licensed under the MIT license. See LICENSE.md for details.

// Stack of virtual filesystems where we find files that TeX looks for.

var OutputFile = (function OutputFile_closure () {
    function OutputFile () {
	this.lines = [''];
    }

    var proto = OutputFile.prototype;

    proto.write_string = function OutputFile_write_string (text) {
	var lines = text.split ('\n');
	var tidx = this.lines.length - 1;

	this.lines[tidx] += lines[0];

	for (var lidx = 1; lidx < lines.length; lidx++)
	    this.lines[tidx + lidx] = lines[lidx];
    };

    var OutputFileLineBuffer = (function OutputFileLineBuffer_closure () {
	function OutputFileLineBuffer (outputfile) {
	    this.outputfile = outputfile;
	    this.idx = 0;
	}

	var proto = OutputFileLineBuffer.prototype;

	proto.get = function OutputFileLineBuffer_get () {
	    if (this.idx >= this.outputfile.lines.length)
		return EOF;
	    var ret = this.outputfile.lines[this.idx];
	    this.idx++;
	    return ret;
	};

	return OutputFileLineBuffer;
    }) ();

    proto.as_linebuffer = function OutputFile_as_linebuffer () {
	return new OutputFileLineBuffer (this);
    };

    return OutputFile;
}) ();

var IOStack = (function IOStack_closure () {
    function IOStack () {
	this.layers = [];
	this.written_paths = {};
    }

    var proto = IOStack.prototype;

    proto.push = function IOStack_push (layer) {
	// Layers must implement try_open_linebuffer(path), which returns a
	// LineBuffer or null if the path is unavailable.
	//
	// They should also implement get_contents_ab(path), which returns an
	// ArrayBuffer or null. Semantics as above.
	this.layers.push (layer);
    };

    function texpaths (texfn) {
	return [texfn, texfn + '.tex'];
    }

    proto.try_open_linebuffer = function IOStack_try_open_linebuffer (texfn) {
	var paths = texpaths (texfn);

	for (var i = 0; i < paths.length; i++) {
	    if (this.written_paths.hasOwnProperty (paths[i]))
		// safety: ensure that it's been closed? prevent further writes?
		return this.written_paths[paths[i]].as_linebuffer ();
	}

	for (var i = this.layers.length - 1; i >= 0; i--) {
	    var layer = this.layers[i];

	    for (var j = 0; j < paths.length; j++) {
		var path = paths[j];

		var rv = layer.try_open_linebuffer (path);
		if (rv == null)
		    continue;

		return rv;
	    }
	}

	return null;
    };

    proto.get_contents_ab = function IOStack_get_contents_ab (texfn) {
	// XXX: code duplication with the above.
	var paths = texpaths (texfn);

	for (var i = 0; i < paths.length; i++) {
	    if (this.written_paths.hasOwnProperty (paths[i]))
		throw new TexRuntimeError ('system file %s shadowed by ' +
					   'locally-written version', texfn);
	}

	for (var i = this.layers.length - 1; i >= 0; i--) {
	    var layer = this.layers[i];

	    for (var j = 0; j < paths.length; j++) {
		var path = paths[j];

		var rv = layer.get_contents_ab (path);
		if (rv == null)
		    continue;

		return rv;
	    }
	}

	return null;
    };

    proto.open_for_write = function IOStack_open_for_write (texfn) {
	// The returned object implements a function write_string that accepts
	// a string. Newlines must be given explicitly by the caller.
	//
	// Proper behavior seems to be to allow writing to any filename, even
	// something like 'plain.tex' that exists farther down in the input
	// stack. Also, multiple opens should truncate and start from scratch
	// again.

	var outf = new OutputFile ();
	this.written_paths[texfn] = outf;
	return outf;
    };

    return IOStack;
}) ();

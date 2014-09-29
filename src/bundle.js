'use strict';

var Bundle = (function Bundle_closure () {
    function Bundle (zipreader) {
	this.zipreader = zipreader;
    }

    var proto = Bundle.prototype;

    function texpaths (texfn) {
	return [texfn, texfn + '.tex'];
    }

    proto.try_open_linebuffer = function Bundle_try_open_linebuffer (texfn) {
	// XXX crappy API hangover from days of asynchronous model!
	var paths = texpaths (texfn);

	while (paths.length) {
	    var path = paths.shift ();

	    if (!this.zipreader.has_entry (path))
		continue;

	    var lines = this.zipreader.get_entry_str (path).split ('\n');
	    return LineBuffer.new_static (lines);
	}

	return null;
    };

    proto.get_contents_ab = function Bundle_get_contents_ab (path) {
	// XXX crappy API hangover from days of asynchronous model!
	if (this.zipreader.has_entry (path))
	    return null;

	return this.zipreader.get_entry_ab (path);
    };

    proto.promise_json = function Bundle_promise_json (path) {
	// XXX crappy API hangover from days of asynchronous model!

	var jp = new JSONStreamParser ();
	jp.onError = function (err) { throw err; };
	jp.onValue = function (value) { jp._last_value = value; };

	var buf = this.zipreader.get_entry_txt (path);
	jp.write (buf);
	return jp._last_value;
    };

    return Bundle;
}) ();

WEBTEX.Bundle = Bundle;

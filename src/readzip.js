/* Streaming random access to the zip file format. Based on previous work
 *
 *   - zip.js by Gildas Lormeau (BSD license)
 *   - node-zipfile by Dane Springmeyer (BSD license)
 *   - jszip by Stuart Knightley (MIT license)
 *
 * The problem with all of these is that they don't stream data in or out --
 * they want the zip entries, or even the whole zip file, to be in a giant
 * buffer in memory. Actually, as far as I can tell, zip.js essentially can do
 * that, but the code style is very different from mine and it's very hard for
 * me to make sense of the structure. My needs are simple enough that I think
 * it'll be easier just to write a new implementation in a familiar style.
 */

'use strict';

// XXX XXX we are assuming node.js buffer API for the low-level data
// packing/unpacking. Blobs (e.g.) look to be similar, but we need to find a
// way to have one API for everything!

var ZipReader = WEBTEX.ZipReader = (function ZipReader_closure () {
    var ZIP_EOCDR_MAGIC = 0x06054b50;
    var ZIP_DIREC_MAGIC = 0x02014b50;
    var ZIP_ENTRY_MAGIC = 0x03044b50;

    function ZipReader (readfunc, zipsize) {
	if (zipsize < 22)
	    throw new TexRuntimeException ('ill-formed Zip stream: only ' +
					   zipsize + ' bytes');

	this.readfunc = readfunc;
	this.zipsize = zipsize;
	this.error_state = null;
	this.dirinfo = null;

	// TODO: read header, check Zip-ness, check for ZIP64.
	readfunc (zipsize - 22, 22, this._cb_read_EOCDR.bind (this));
    }

    var proto = ZipReader.prototype;

    proto._cb_read_EOCDR = function ZipReader__cb_read_EOCDR (buf, err) {
	if (err != null) {
	    this.error_state = 'EOCDR read error: ' + err;
	    return;
	}

	if (buf.readUInt32LE (0) != ZIP_EOCDR_MAGIC) {
	    this.error_state = 'EOCDR wrong magic';
	    return;
	}

	this._nfiles = buf.readUInt16LE (8);
	this._cdofs = buf.readUInt32LE (16);

	if (this._cdofs > this.zipsize - 22) {
	    this.error_state = 'EOCDR directory offset invalid: ofs ' +
		this._cdofs + '; total size ' + this.zipsize;
	    return;
	}

	this.readfunc (this._cdofs,
		       this.zipsize - 22 - this._cdofs,
		       this._cb_read_directory.bind (this));
    };

    proto._cb_read_directory = function ZipReader__cb_read_directory (buf, err) {
	if (this.error_state != null)
	    return;

	if (err != null) {
	    this.error_state = 'Zip directory read error: ' + err;
	    return;
	}

	var dirinfo = {};
	var offset = 0;

	for (var i = 0; i < this._nfiles; i++) {
	    var magic = buf.readUInt32LE (offset);
	    if (magic != ZIP_DIREC_MAGIC) {
		this.error_state = 'bad Zip: wrong magic number in entry';
		return;
	    }

	    var flags = buf.readUInt16LE (offset + 8);
	    if (flags & 0x1) {
		this.error_state = 'bad Zip: encrypted entries';
		return;
	    }

	    if (offset + 46 > buf.length) {
		this.error_state = 'bad Zip: overlarge central directory';
		return;
	    }

	    var compression = buf.readUInt16LE (offset + 10),
	        csize = buf.readUInt32LE (offset + 20),
	        ucsize = buf.readUInt32LE (offset + 24),
	        fnlen = buf.readUInt16LE (offset + 28),
	        extralen = buf.readUInt16LE (offset + 30),
	        cmntlen = buf.readUInt16LE (offset + 32),
	        recofs = buf.readUInt32LE (offset + 42);

	    var dataofs = recofs + 30 + fnlen + extralen;

	    if (dataofs + csize > this.zipsize) {
		this.error_state = 'bad Zip: bad data size/offset';
		return;
	    }

	    if (csize == 0xFFFFFFFF || ucsize == 0xFFFFFFFF) {
		this.error_state = 'bad Zip: I can\'t handle ZIP64';
		return;
	    }

	    if (offset + 46 + fnlen + extralen + cmntlen > buf.length) {
		this.error_state = 'bad Zip: overlarge central directory (2)';
		return;
	    }

	    if (compression && compression != 8) {
		this.error_state = 'bad Zip: I can only handle DEFLATE compression';
		return;
	    }

	    var fn = buf.toString ('ascii', offset + 46, offset + 46 + fnlen);
	    dirinfo[fn] = {'csize': csize,
			   'ucsize': ucsize,
			   'compression': compression,
			   'dataofs': dataofs};
	    offset += 46 + fnlen + extralen + cmntlen;
	}

	this.dirinfo = dirinfo;
    };

    proto.stream_entry = function ZipReader_stream_entry (entname, callback) {
	if (this.error_state != null)
	    throw new TexRuntimeException ('previous Zip error: ' + this.error_state);
	if (this.dirinfo == null)
	    // XXX ugggh not sure how we deal with these issues without descending
	    // into nested callback hell.
	    throw new TexRuntimeException ('eek haven\'t yet read in Zip info');

	if (!this.dirinfo.hasOwnProperty (entname))
	    // XXX tell this to the callback?
	    throw new TexRuntimeException ('no such Zip entry ' + entname);

	var info = this.dirinfo[entname];
	var state = {'info': info, 'cb': callback};
	state.nleft = info.csize;
	state.curofs = info.dataofs;
	// The buffer must be at least 32k for zlib to work since it uses a
	// lookback buffer of that size.
	state.buf = new Buffer (32768);

	if (info.compression) {
	    // XXX HARDCODING node.js
	    var zlib = require ('zlib');
	    var inflate = zlib.createInflate ();
	    inflate.on ('data', callback); // XXX may need custom wrapper depending on cb convention
	    state.cb = function (buf) {
		if (buf == null)
		    inflate.end ();
		else
		    inflate.write (buf);
	    };
	    // zlib expects this header, but the underlying Zip inflated
	    // stream doesn't contain it.
	    var header = new Buffer (2);
	    header.writeUInt8 (0x78, 0);
	    header.writeUInt8 (0x9c, 1);
	    inflate.write (header);
	}

	this.readfunc (state.curofs,
		       Math.min (state.nleft, state.buf.length),
		       function (buf, err) {
			   this._cb_do_stream (buf, err, state);
		       }.bind (this));
    };

    proto._cb_do_stream = function ZipReader__cb_do_stream (buf, err, state) {
	if (this.error_state != null)
	    // XXX tell the callback there was an error!
	    return;

	if (err != null) {
	    this.error_state = 'Zip entry read error: ' + err;
	    return;
	}

	state.cb (buf);
	state.nleft -= buf.length;
	state.curofs += buf.length;

	if (state.nleft <= 0)
	    state.cb (null) // XXX better covention
	else {
	    this.readfunc (state.curofs,
			   Math.min (state.nleft, state.buf.length),
			   function (buf, err) {
			       this._cb_do_stream (buf, err, state)
			   }.bind (this));
	}
    };

    return ZipReader;

}) ();

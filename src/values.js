// The core TeX Value implementations.

var TexInt = (function TexInt_closure () {
    var INT_MAX = 2147483647; // 2**31 - 1

    // These objects are immutable.
    function TexInt (value) {
	if (value instanceof TexInt) {
	    this.value = value;
	} else if (typeof value != 'number') {
	    throw new TexInternalError ('non-numeric TexInt value ' + value);
	} else if (value % 1 != 0) {
	    throw new TexInternalError ('non-integer TexInt value ' + value);
	} else {
	    this.value = value | 0;
	}

	if (Math.abs (this.value) > INT_MAX)
	    throw new TexRuntimeError ('out-of-range TexInt value %d', value);
    }

    inherit (TexInt, Value);
    var proto = TexInt.prototype;

    TexInt.xcheck = function TexInt_xcheck (value) {
	/* This function checks that its input could be a valid TeX integer,
	 * though it's agnostic as to whether it's a TexInt instance or a
	 * JS-native number. It returns that input as a JS integer; I call
	 * these checked values "tex-int"s. This simplifies a lot of math with
	 * Scaleds where it'd be irritating to keep on converting JS ints to
	 * TexInts for temporary manipulations. */

	if (value instanceof TexInt)
	    return value.value;

	if (typeof value != 'number')
	    throw new TexInternalError ('non-numeric tex-int value ' + value);
	if (value % 1 != 0)
	    throw new TexInternalError ('non-integer tex-int value ' + value);

	value = value | 0; // magic coercion to trustworthy int representation.

	if (Math.abs (value) > INT_MAX)
	    throw new TexRuntimeError ('out-of-range tex-int value %d', value);

	return value;
    };

    proto.toString = function TexInt_toString () {
	return '<' + this.value + '|i>';
    };

    proto.to_texstr = function TexInt_to_texstr () {
	return '' + this.value;
    };

    proto.clone = function TexInt_clone () {
	return new TexInt (this.value);
    };

    proto.is_nonzero = function TexInt_is_nonzero () {
	return (this.value != 0);
    };

    proto.as_int = function TexInt_as_int () {
	return this; // NOTE: ok since TexInts are immutable
    };

    proto.as_scaled = function TexInt_as_scaled () {
	return null;
    };

    proto.as_dimen = function TexInt_as_dimen () {
	return null;
    };

    proto.as_glue = function TexInt_as_glue () {
	return null;
    };

    proto.as_serializable = function TexInt_as_serializable () {
	return this.value;
    };

    TexInt.deserialize = function TexInt_deserialize (data) {
	return new TexInt (parseInt (data, 10));
    };

    proto.advance = function TexInt_advance (other) {
	return new TexInt (this.value + other.value);
    };

    proto.intproduct = function TexInt_intproduct (k) {
	k = TexInt.xcheck (k);
	return new TexInt (this.value * k);
    };

    proto.intdivide = function TexInt_intdivide (k) {
	k = TexInt.xcheck (k);
	return new TexInt (this.value / k >> 0);
    };

    proto.rangecheck = function TexInt_rangecheck (engine, min, max) {
	if (this.value >= min && this.value <= max)
	    return this;

	engine.warn ('expected integer in [' + min + ', ' + max + ']; got ' +
		     this.value + '; using 0');
	return TexInt (0);
    };

    return TexInt;
}) ();


var Scaled = (function Scaled_closure () {
    var SC_HALF  = 0x8000,     // 2**15 = 32768      = '100000
        SC_UNITY = 0x10000,    // 2**16 = 65536      = '200000
        SC_TWO   = 0x20000,    // 2**17 = 131072     = '400000
        SC_MAX   = 0x40000000, // 2**30 = 1073741824 = '10000000000
        UNSCALE  = Math.pow (2, -16),
        INT_MAX = 2147483647; // 2**31 - 1 ; XXX redundant with above.

    // These objects are immutable.
    function Scaled (value) {
	if (value instanceof Scaled)
	    this.value = value.value;
	else
	    this.value = TexInt.xcheck (value);
    }

    inherit (Scaled, Value);
    var proto = Scaled.prototype;

    // Math library.

    function div (a, b) {
	return a / b >> 0;
    }

    function mult_and_add (n, x, y, maxanswer) {
	// n: tex-int
	// x, y, retval: Scaled
	// maxanswer: js int

	if (n < 0) {
	    var xv = -x.value;
	    n = -n;
	} else {
	    var xv = x.value;
	}

	if (n == 0)
	    return y;

	var yv = y.value;

	if (xv <= div (maxanswer - yv, n) && -xv <= div (maxanswer + yv, n))
	    return new Scaled (n * xv + yv);
	throw new TexRuntimeError ('over/underflow in mult+add');
    }

    Scaled.new_from_parts = function Scaled_new_from_parts (nonfrac, frac) {
	nonfrac = TexInt.xcheck (nonfrac);
	frac = TexInt.xcheck (frac);
	return new Scaled (nonfrac * SC_UNITY + frac);
    };

    Scaled.new_parts_product =
	function Scaled_new_parts_product (num, denom, nonfrac, frac) {
	    // equivalent to `new_from_parts (nonfrac, frac) * (num/denom)` with
	    // better precision than you'd get naively.
	    num = TexInt.xcheck (num);
	    denom = TexInt.xcheck (denom);
	    nonfrac = TexInt.xcheck (nonfrac);
	    frac = TexInt.xcheck (frac);

	    var s = new Scaled (nonfrac);
	    var t = s.times_n_over_d (num, denom); // -> [result, remainder]
	    frac = div ((num * frac + SC_UNITY * t[1]), denom);
	    nonfrac = t[0].value + div (frac, SC_UNITY);
	    frac = frac % SC_UNITY;
	    return Scaled.new_from_parts (nonfrac, frac);
	};

    Scaled.new_from_decimals =
	function Scaled_new_from_decimals (digarray) {
	    var a = 0;
	    while (digarray.length)
		a = div (a + digarray.pop () * SC_TWO, 10);
	    return div (a + 1, 2);
	};

    proto.times_n_plus_y = function Scaled_times_n_plus_y (n, y) {
	// OO interpretation of nx_plus_y.
	// n: tex-int
	// y: Scaled
	// returns: Scaled(n*this+y)

	n = TexInt.xcheck (n);
	if (!(y instanceof Scaled))
	    throw new TexInternalError ('nx+y called with non-Scaled y: ' + y);
	return mult_and_add (n, this, y, SC_MAX - 1);
    };

    proto.times_n_over_d = function Scaled_times_n_over_d (n, d) {
	// OO interpretation of xn_over_d.
	// n: tex-int
	// d: tex-int
	// returns: [Scaled(result), Scaled(remainder)]
	//   where the remainder is relevant if the low-significance digits
	//   of (this*n/d) must be rounded off.

	n = TexInt.xcheck (n);
	d = TexInt.xcheck (d);

	var positive = (this.value >= 0);
	if (positive)
	    var xv = this.value
	else
	    var xv = -this.value;

	var t = (xv % SC_HALF) * n;
	var u = div (xv, SC_HALF) * n + div (t, SC_HALF);
	var v = (u % d) * SC_HALF + (t % SC_HALF);

	if (div (u, d) > SC_HALF)
	    throw new TexRuntimeError ('over/underflow in xn_over_d');

	var w = SC_HALF * div (u, d) + div (v, d);

	if (positive)
	    return [new Scaled (w), new Scaled (v % d)];
	return [new Scaled (-w), new Scaled (-(v % d))];
    };

    proto.over_n = function Scaled_over_n (n) {
	// OO version of x_over_n.
	// n: tex-int
	// returns: [Scaled(x/n), Scaled(remainder)]
	//   where the remainder is relevant if the low-significance digits
	//   of (this/n) must be rounded off.

	n = TexInt.xcheck (n);
	if (n.value == 0)
	    throw new TexRuntimeError ('really, dividing by 0?');

	var negative = false;

	if (n < 0) {
	    var xv = -this.value;
	    n = -n;
	    negative = true;
	} else {
	    var xv = this.value;
	}

	if (xv >= 0) {
	    var rv = div (xv, n), rem = xv % n;
	} else {
	    var rv = -div (-xv, n), rem = -((-xv) % n);
	}

	if (negative)
	    rem = -rem;

	return [new Scaled (rv), new Scaled (rem)];
    };

    proto.times_parts = function Scaled_times_parts (nonfrac, frac) {
	nonfrac = TexInt.xcheck (nonfrac);
	frac = TexInt.xcheck (frac);
	var res = this.times_n_over_d (frac, SC_UNITY)[0];
	return this.times_n_plus_y (nonfrac, res);
    };

    // Higher-level stuff.

    proto.toString = function Scaled_toString () {
	return '<~' + this.asfloat ().toFixed (6) + '|s>';
    };

    proto.clone = function Scaled_clone () {
	return new Scaled (this.value);
    };

    proto.is_nonzero = function Scaled_is_nonzero () {
	return (this.value != 0);
    };

    proto.as_int = function Scaled_as_int () {
	return new TexInt (this.value);
    };

    proto.as_scaled = function Scaled_as_scaled () {
	return this; // NOTE: ok since Scaleds are immutable.
    };

    proto.as_dimen = function Scaled_as_dimen () {
	return null;
    };

    proto.as_glue = function Scaled_as_glue () {
	return null;
    };

    proto.as_serializable = function Scaled_as_serializable () {
	return this.value;
    };

    Scaled.deserialize = function Scaled_deserialize (data) {
	return new Scaled (parseInt (data, 10));
    };

    proto.advance = function Scaled_advance (other) {
	return new Scaled (this.value + other.value);
    };

    proto.intproduct = function Scaled_intproduct (k) {
	k = TexInt.xcheck (k);
	return this.times_parts (k, 0);
    };

    proto.intdivide = function Scaled_intdivide (k) {
	k = TexInt.xcheck (k);
	return this.clone ().over_n (k)[0];
    };

    proto.asfloat = function Scaled_asfloat () {
	return this.value * UNSCALE;
    };

    return Scaled;
}) ();


var Dimen = (function Dimen_closure () {
    var MAX_SCALED = 0x40000000; // 2**30 = 1073741824 = '10000000000

    // These objects are mutable.
    function Dimen () {
	this.sp = new Scaled (0);
    }

    inherit (Dimen, Value);
    var proto = Dimen.prototype;

    Dimen.new_scaled = function Dimen_new_scaled (sp) {
	if (!(sp instanceof Scaled))
	    throw new TexInternalError ('expected Scaled value, got ' + sp);

	var d = new Dimen ();
	d.sp = sp;
	return d;
    };

    Dimen.new_product = function Dimen_new_product (k, x) {
	// k: tex-int
	// x: Scaled
	k = TexInt.xcheck (k);
	if (!(x instanceof Scaled))
	    throw new TexInternalError ('expected Scaled value, got ' + x);

	var d = new Dimen ();
	d.sp = x.times_n_plus_y (k, new Scaled (0));
	if (Math.abs (d.sp.value) > MAX_SCALED)
	    throw new TexRuntimeError ('dimension out of range: %o', d);
	return d;
    };

    proto.toString = function Dimen_toString () {
	return this.sp.asfloat ().toFixed (3) + 'pt';
    };

    proto.to_texstr = function Dimen_to_texstr () {
	// Tex always shows at least 1 decimal place, and more if needed.
	var text = this.sp.asfloat ().toFixed (7);

	while (text[text.length - 1] == '0') {
	    if (text[text.length - 2] == '.')
		break;
	    text = text.slice (0, -1);
	}

	return text + 'pt';
    };

    proto.clone = function Dimen_clone () {
	var d = new Dimen ();
	d.sp = this.sp.clone ();
	return d;
    };

    proto.is_nonzero = function Dimen_is_nonzero () {
	return this.sp.is_nonzero ();
    };

    proto.set_to = function Dimen_set_to (val) {
	if (val instanceof Scaled)
	    this.sp = val;
	else if (val instanceof Dimen)
	    this.sp = val.sp;
	else
	    throw new TexInternalError ('expected Scaled or Dimen value, got ' + val);
	return this;
    };

    proto.as_int = function Dimen_as_int () {
	return this.sp.as_int ();
    };

    proto.as_scaled = function Dimen_as_scaled () {
	return this.sp; // NOTE: ok since Scaleds are immutable.
    };

    proto.as_dimen = function Dimen_as_dimen () {
	return this.clone ();
    };

    proto.as_glue = function Dimen_as_glue () {
	return null;
    };

    proto.as_serializable = function Dimen_as_serializable () {
	return this.sp.as_serializable ();
    };

    Dimen.deserialize = function Dimen_deserialize (data) {
	var d = new Dimen ();
	d.set_to (Scaled.deserialize (data));
	return d;
    };

    proto.advance = function Dimen_advance (other) {
	var d = new Dimen ();
	d.set_to (d.sp.advance (other.as_scaled ()));
	return d;
    };

    proto.intproduct = function Dimen_intproduct (k) {
	k = TexInt.xcheck (k);
	var d = new Dimen ();
	d.set_to (this.sp.intproduct (k));
	return d;
    };

    proto.intdivide = function Dimen_intdivide (k) {
	k = TexInt.xcheck (k);
	var d = this.clone ();
	d.set_to (this.sp.intdivide (k));
	return d;
    };

    return Dimen;
}) ();


var Glue = (function Glue_closure () {
    function Glue () {
	this.width = new Dimen ();
	this.stretch = new Dimen ();
	this.stretch_order = 0;
	this.shrink = new Dimen ();
	this.shrink_order = 0;
    }

    inherit (Glue, Value);
    var proto = Glue.prototype;

    proto.toString = function Glue_toString () {
	return '<Glue ' + this.width + ' st=' + this.stretch + '|' +
	    this.stretch_order + ' sh=' + this.shrink + '|' +
	    this.shrink_order + '>';
    };

    proto.to_texstr = function Glue_to_texstr () {
	var t = this.width.to_texstr ();

	if (this.stretch.is_nonzero ()) {
	    t += ' plus ';
	    t += this.stretch.to_texstr ();
	    if (this.stretch_order > 0) {
		t = t.slice (0, -2); // strip trailing 'pt'
		t += 'fil';
		if (this.stretch_order > 1)
		    t += 'l';
		if (this.stretch_order > 2)
		    t += 'l';
	    }
	}

	if (this.shrink.is_nonzero ()) {
	    t += ' minus ';
	    t += this.shrink.to_texstr ();
	    if (this.shrink_order > 0) {
		t = t.slice (0, -2); // strip trailing 'pt'
		t += 'fil';
		if (this.shrink_order > 1)
		    t += 'l';
		if (this.shrink_order > 2)
		    t += 'l';
	    }
	}

	return t;
    };

    proto.clone = function Glue_clone () {
	var g = new Glue ();
	g.width = this.width.clone ();
	g.stretch = this.stretch.clone ();
	g.stretch_order = this.stretch_order;
	g.shrink = this.shrink.clone ();
	g.shrink_order = this.shrink_order;
	return g;
    };

    proto.is_nonzero = function Glue_is_nonzero () {
	return (this.width.is_nonzero () ||
		this.stretch.is_nonzero () ||
		this.stretch_order != 0 ||
		this.shrink.is_nonzero () ||
		this.shrink_order != 0);
    };

    proto.as_int = function Glue_as_int () {
	return this.width.as_int ();
    };

    proto.as_scaled = function Glue_as_scaled () {
	return this.width.as_scaled ();
    };

    proto.as_dimen = function Glue_as_dimen () {
	return this.width.clone ();
    };

    proto.as_glue = function Glue_as_glue () {
	return this.clone ();
    };

    proto.as_serializable = function Glue_as_serializable () {
	return [this.width.as_serializable (),
		this.stretch.as_serializable (),
		this.stretch_order,
		this.shrink.as_serializable (),
		this.shrink_order];
    };

    Glue.deserialize = function Glue_deserialize (data) {
	var g = new Glue ();
	g.width = Dimen.deserialize (data[0]);
	g.stretch = Dimen.deserialize (data[1]);
	g.stretch_order = parseInt (data[2], 10);
	g.shrink = Dimen.deserialize (data[3]);
	g.shrink_order = parseInt (data[4], 10);
	return g;
    };

    proto.advance = function Glue_advance (other) {
	var g = this.clone ();
	g.width = this.width.advance (other.width);
	g.stretch = this.stretch.advance (other.stretch);
	g.shrink = this.shrink.advance (other.shrink);
	return g;
    };

    proto.intproduct = function Glue_intproduct (k) {
	k = TexInt.xcheck (k);
	var g = this.clone ();
	g.width = this.width.intproduct (k);
	g.stretch = this.stretch.intproduct (k);
	g.shrink = this.shrink.intproduct (k);
	return g;
    };

    proto.intdivide = function Glue_intdivide (k) {
	k = TexInt.xcheck (k);
	var g = this.clone ();
	g.width = this.width.intdivide (k);
	g.stretch = this.stretch.intdivide (k);
	g.shrink = this.shrink.intdivide (k);
	return g;
    };

    return Glue;
}) ();


var Toklist = (function Toklist_closure () {
    function Toklist (toks) {
	if (toks == null)
	    this.toks = [];
	else if (toks instanceof Array) {
	    this.toks = toks.slice ();
	    for (var i = 0; i < toks.length; i++)
		if (!(toks[i] instanceof Token))
		    throw new TexInternalError ('non-token in toklist: ' + toks[i]);
	} else
	    throw new TexInternalError ('unexpected Toklist() argument: ' + toks);
    }

    inherit (Toklist, Value);
    var proto = Toklist.prototype;

    proto.toString = function Toklist_toString () {
	return this.as_serializable ();
    };

    proto.uitext = function Toklist_uitext () {
	/* User-friendly-ish representation of a toklist. */
	return this.toks.map (function (t) {
	    return t.uitext ();
	}).join ('');
    };

    proto.textext = function Toklist_textext (engine, ismacro) {
	/* TeX representation of a toklist for \message, \write, etc. */
	return this.toks.map (function (t) {
	    return t.textext (engine, ismacro);
	}).join ('');
    };

    proto.to_texstr = function Toklist_to_texstr () {
	throw new TexInternalError ('\\the of toklist should be handled specially');
    };

    proto.clone = function Toklist_clone () {
	var n = new Toklist ();
	n.toks = this.toks.slice ();
	return n;
    };

    proto.is_nonzero = function Toklist_is_nonzero () {
	return this.toks.length > 0;
    };

    proto.as_serializable = function Toklist_as_serializable () {
	return this.toks.map (function (t) {
	    return t.to_serialize_str ();
	}).join ('');
    };

    Toklist.deserialize = function Toklist_deserialize (text) {
	var list = [];
	var n = text.length;

	for (var i = 0; i < n; i++) {
	    var o = ord (text[i]);

	    if (o != O_PERCENT) {
		// Standard character.
		list.push (Token.new_char (ord_standard_catcodes[o], o));
		continue;
	    }

	    i++;
	    if (i >= n)
		throw new TexRuntimeError ('malformed serialized toklist: %s', text);

	    o = ord (text[i]);

	    if (o == O_HASH) {
		// Macro parameter token.
		i++;
		if (i >= n)
		    throw new TexRuntimeError ('malformed serialized toklist: %s', text);

		o = ord (text[i]);
		list.push (Token.new_param (o - O_ZERO));
		continue;
	    }

	    if ((o >= O_ZERO && o < O_ZERO + 10) ||
		(o >= O_LC_A && o < O_LC_A + 6) ||
		(o >= O_UC_A && o < O_UC_A + 6)) {
		// Escaped character.
		if (i + 2 >= n)
		    throw new TexRuntimeError ('malformed serialized toklist: %s', text);
		o = parseInt (text.substr (i, 2), 16);
		var cc = cc_idchar_unmap[text[i+2]];
		list.push (Token.new_char (cc, o));
		i += 2;
		continue; // catcode id char will be eaten by the for loop increment.
	    }

	    if (o != O_LEFT_BRACKET)
		throw new TexRuntimeError ('malformed serialized toklist: %s', text);

	    // We must be a cseq.
	    i++;
	    if (i >= n)
		throw new TexRuntimeError ('malformed serialized toklist: %s', text);

	    var name = '';

	    while (i < n) {
		o = ord (text[i]);

		if (o == O_RIGHT_BRACKET)
		    break;

		if (o != O_PERCENT) {
		    name += text[i];
		    i++;
		    continue;
		}

		// We must be an escaped character. No catcodes here.
		if (i + 2 >= n) // recall that we need at least the close bracket.
		    throw new TexRuntimeError ('malformed serialized toklist: %s', text);
		o = parseInt (text.substr (i + 1, 2), 16);
		name += String.fromCharCode (o);
		i += 3;
	    }

	    if (i >= n)
		// We ran off the end of the string!
		throw new TexRuntimeError ('malformed serialized toklist: %s', text);

	    // Finished the cseq successfully. For loop will eat the ].
	    list.push (Token.new_cseq (name));
	}

	return new Toklist (list);
    };

    return Toklist;
}) ();


var Font = (function Font_closure () {
    function Font (engine, ident, scale) {
	this.ident = ident;
	this.scale = scale;
	this.hyphenchar = null;
	this.skewchar = null;

	// I thought about lazy loading of the metrics, but that means that
	// every font-dimen operation needs an engine as an argument. Easier
	// just to load automatically.

	if (ident == 'nullfont') {
	    this.metrics = null; // XXX: special NullMetrics class.
	    this.dimens = null; // ditto?
	} else {
	    var contents = engine.iostack.get_contents_ab (ident + '.tfm');
	    this.metrics = new TfmReader (contents, scale);
	    this.dimens = [];

	    for (var i = 0; i < this.metrics.font_dimens.length; i++) {
		this.dimens.push (new Dimen ());
		this.dimens[i].set_to (this.metrics.font_dimens[i]);
	    }
	}

	engine.set_font (ident, this);
    }

    inherit (Font, Value);
    var proto = Font.prototype;

    proto.toString = function Font_toString () {
	return '<Font ' + this.ident + '@' + this.scale + '>';
    };

    proto.equals = function Font_equals (other) {
	if (other == null)
	    return false;
	if (!(other instanceof Font))
	    throw new TexInternalError ('comparing Font to ' + other);
	return (this.ident == other.ident) && (this.scale == other.scale);
    };

    proto.get_serialize_ident = function Font_get_serialize_ident (state, housekeeping) {
	if (this._serialize_ident == null) {
	    // Not sure about this, but Engine ctor creates nullfont by default.
	    if (this.ident == 'nullfont')
		this._serialize_ident = '<null>';
	    else {
		this._serialize_ident = state.fonts.length;
		state.fonts.push ([this.ident,
				   this.scale,
				   this.dimens,
				   this.hyphenchar,
				   this.skewchar]);
	    }
	}

	return this._serialize_ident;
    };

    Font.deserialize = function Font_deserialize (engine, data) {
	var font = new Font (engine, data[0], data[1]);
	font.dimens = data[2];
	font.hyphenchar = data[3];
	font.skewchar = data[4];
	return font;
    };

    proto.get_metrics = function Font_get_metrics () {
	return this.metrics;
    };

    proto.get_dimen = function Font_get_dimen (number) {
	if (this.dimens == null)
	    // nullfont case
	    return new Dimen ();

	// TeX font dimens are 1-based; we offset.
	if (number > this.dimens.length)
	    throw new TexRuntimeError ('undefined fontdimen #%d for %o', number, this);
	return this.dimens[number - 1];
    };

    proto.set_dimen = function Font_set_dimen (number, value) {
	// XXX: we're supposed to only allow the number of parameters to be
	// extended "just after the font has been loaded". (TeXBook p. 433).

	while (this.dimens.length < number)
	    this.dimens.push (new Dimen ());
	this.dimens[number - 1] = value;
    };

    proto.has_ord = function Font_has_ord (ord) {
	return this.get_metrics ().has_ord (ord);
    };

    proto.box_for_ord = function Font_box_for_ord (ord) {
	return this.metrics.box_for_ord (this, ord);
    };

    proto.italic_correction = function Font_italic_correction (ord) {
	return this.metrics.italic_correction (ord);
    };

    return Font;
}) ();

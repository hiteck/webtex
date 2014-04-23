// References to values, as many commands are.

var Valref = (function Valref_closure () {
    function Valref () {}
    var proto = Valref.prototype;

    proto.get = function Valref_get (engine) {
	/* Retrieve the actual value of this reference. Typically involves
	 * scanning tokens in the engine. May return null if there's no value
	 * but that situation is expected. */
	throw new TexInternalError ('not implemented Valref.get');
    };

    proto.set = function Valref_set (engine, value) {
	/* Assign a new value to the storage location that this reference
	 * represents. */
	throw new TexInternalError ('not implemented Valref.set');
    };

    proto.scan = function Valref_scan (engine) {
	/* Scan a value of the kind that this object references. Note that
	 * this is some kind of literal that the engine's ready to read;
	 * it's not necessarily the value that this particular reference
	 * points to. */
	throw new TexInternalError ('not implemented Valref.scan');
    };

    proto.is_toks_value = false;
    /* Somewhat hacky property to help with toklist scanning. Works how
     * it sounds. */

    return Valref;
}) ();


var RegisterValref = (function RegisterValref_closure () {
    function RegisterValref (valtype, reg) {
	/* All valtypes are OK: int dimen glue muglue toklist boxlist */
	if (reg < 0 || reg > 255)
	    throw new TexInternalError ('illegal register ' + reg);
	Valref.call (this);
	this.valtype = valtype;
	this.reg = reg;
	this.is_toks_value = (valtype == T_TOKLIST); // XXX temporary
    }

    inherit (RegisterValref, Valref);
    var proto = RegisterValref.prototype;

    proto.scan = function RegisterValref_scan (engine) {
	// XXX this function will probably no longer be needed once we switch
	// over.
	return engine.scan_valtype (this.valtype);
    };

    proto.get = function RegisterValref_get (engine) {
	return engine.get_register (this.valtype, this.reg);
    };

    proto.set = function RegisterValref_set (engine, value) {
	engine.set_register (this.valtype, this.reg, value);
    };

    return RegisterValref;
}) ();


var ParamValref = (function ParamValref_closure () {
    function ParamValref (valtype, name) {
	/* All valtypes are OK: int dimen glue muglue toklist boxlist */
	if (valtype == T_BOXLIST)
	    throw new TexInternalError ('boxlist named parameters are forbidden');

	Valref.call (this);
	this.valtype = valtype;
	this.name = name;
	this.is_toks_value = (valtype == T_TOKLIST); // XXX temporary
    }

    inherit (ParamValref, Valref);
    var proto = ParamValref.prototype;

    proto.scan = function ParamValref_scan (engine) {
	// XXX to be removed.
	return engine.scan_valtype (this.valtype);
    };

    proto.get = function ParamValref_get (engine) {
	return engine.get_parameter (this.valtype, this.name);
    };

    proto.set = function ParamValref_set (engine, value) {
	engine.set_parameter (this.valtype, this.name, value);
    };

    return ParamValref;
}) ();


var ConstantValref = (function ConstantValref_closure () {
    function ConstantValref (value) {
	Valref.call (this);
	this.value = value;
    }

    inherit (ConstantValref, Valref);
    var proto = ConstantValref.prototype;

    proto.get = function ConstantValref_get (engine) {
	return this.value;
    };

    proto.set = function ConstantValref_set (engine, value) {
	throw new TexRuntimeError ('cannot set a constant Valref')
    };

    return ConstantValref;
}) ();


function _make_int_valref (type) {
    type.prototype.scan = function IntValref_scan (engine) {
	return engine.scan_int ();
    };

    return type; // convenience.
}

function _make_dimen_valref (type) {
    type.prototype.scan = function DimenValref_scan (engine) {
	return engine.scan_dimen ();
    };

    return type;
}

function _make_glue_valref (type) {
    type.prototype.scan = function GlueValref_scan (engine) {
	return engine.scan_glue ();
    };

    return type;
}

function _make_muglue_valref (type) {
    type.prototype.scan = function MuGlueValref_scan (engine) {
	return engine.scan_glue ({mumode: true});
    };

    return type;
}

function _make_toks_valref (type) {
    type.prototype.scan = function ToksValref_scan (engine) {
	engine.scan_one_optional_space ();

	var tok = engine.next_tok ();
	if (tok === NeedMoreData || tok === EOF)
	    throw tok;

	// TODO: \tokpar=<toklist register or toklist param>
	if (!tok.iscat (C_BGROUP))
	    throw new TexSyntaxError ('expected { in toklist assignment; got ' + tok);

	return engine.scan_tok_group (false);
    };

    type.prototype.is_toks_value = true;

    return type;
}

function _make_font_valref (type) {
    return type; // TODO
}


var ConstantIntValref = (function ConstantIntValref_closure () {
    function ConstantIntValref (value) { ConstantValref.call (this, value); }
    inherit (ConstantIntValref, ConstantValref);
    return _make_int_valref (ConstantIntValref);
}) ();

var ConstantDimenValref = (function ConstantDimenValref_closure () {
    function ConstantDimenValref (value) { ConstantValref.call (this, value); }
    inherit (ConstantDimenValref, ConstantValref);
    return _make_dimen_valref (ConstantDimenValref);
}) ();

var ConstantFontValref = (function ConstantFontValref_closure () {
    function ConstantFontValref (value) { ConstantValref.call (this, value); }
    inherit (ConstantFontValref, ConstantValref);
    return _make_font_valref (ConstantFontValref);
}) ();

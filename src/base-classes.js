// Copyright 2014 Peter Williams and collaborators.
// Licensed under the MIT license. See LICENSE.md for details.

// Base classes for some of the key TeX data types.

var Value = (function Value_closure () {
    // A Value is some kind of datum that can be stored in the TeX engine.
    // Various kinds of values are stored in registers, named parameters, and
    // so on.

    function Value () {}
    var proto = Value.prototype;

    proto.toString = function Value_toString () {
	// Returns the developer-friendly stringification of this object.
	// Should not get back to the TeX engine.
	return '[Value without toString?]';
    };

    proto.to_texstr = function Value_to_texstr () {
	// This function returns the stringification of the value as
	// implemented by TeX's \the primitive.
	throw new TexInternalError ('not implemented Value.to_texstr');
    };

    proto.clone = function Value_clone () {
	// Returns a new, identical copy of this value.
	throw new TexInternalError ('not implemented Value.clone');
    };

    proto.equals = function Value_equals () {
	// Returns whether this object has the same value as another. So far
	// only used to compare fonts in GivenFontCommand.same_cmd, so this may
	// be very overly generic.
	throw new TexInternalError ('not implemented Value.equals');
    };

    proto.is_nonzero = function Value_is_nonzero () {
	// Returns whether this object is different than the default value for
	// its class.
	throw new TexInternalError ('not implemented Value.is_nonzero');
    };

    proto.as_int__I = function Value_as_int__I () {
	// Returns an integer that this value is equivalent to, or null if such
	// a conversion is not allowed.
	throw new TexInternalError ('not implemented Value.as_int__I');
    };

    proto.as_scaled__S = function Value_as_scaled__S () {
	// Returns a scaled that this value is equivalent to, or null if such
	// a conversion is not allowed. Currently this is only used in
	// Engine.scan_dimen__O_S and may be superfluous.
	throw new TexInternalError ('not implemented Value.as_scaled__S');
    };

    proto.as_glue = function Value_as_glue () {
	// Returns a Glue that this value is equivalent to, or null if such a
	// conversion is not allowed. This is used in Engine.scan_glue.
	throw new TexInternalError ('not implemented Value.as_glue');
    };

    proto.as_serializable = function Value_as_serializable () {
	// Returns a unique JSON-compatible representation.
	throw new TexInternalError ('not implemented Value.as_serializable');
    };

    proto.advance = function Value_advance (other) {
	// Implement \advance for this value -- that is, addition. Returns a
	// new advanced value, because some Values are immutable.
	throw new TexInternalError ('not implemented Value.advance');
    };

    proto.product__I_O = function Value_product__I_O (other) {
	// Implement \multiply for this value, which is integer
	// multiplication. Returns a new multiplied value, because some Values
	// are immutable.
	throw new TexInternalError ('not implemented Value.product__I_O');
    };

    proto.divide__I_O = function Value_divide__I_O (other) {
	// Implement \divide for this value, which is integer division.
	// Returns a new divided value, because some Values are immutable.
	throw new TexInternalError ('not implemented Value.divide__I_O');
    };

    // Static functions.

    Value.ensure_boxed = function Value_ensure_boxed (valtype, value) {
	if (valtype == T_INT)
	    return new TexInt (value);

	if (valtype == T_DIMEN) {
	    if (value instanceof Dimen)
		return value;
	    if (typeof value == 'number')
		return new Dimen (value);
	    throw new TexInternalError ('value is not dimen: %o', value);
	}

	if (valtype == T_GLUE || valtype == T_MUGLUE) {
	    if (!(value instanceof Glue))
		throw new TexInternalError ('value is not (mu)glue: %o', value);
	    return value;
	}

	if (valtype == T_TOKLIST) {
	    if (!(value instanceof Toklist))
		throw new TexInternalError ('value is not toklist: %o', value);
	    return value;
	}

	if (valtype == T_BOX) {
	    if (!(value instanceof ListBox))
		throw new TexInternalError ('value is not box: %o', value);
	    return value;
	}

	if (valtype == T_FONT) {
	    if (!(value instanceof Font))
		throw new TexInternalError ('value is not font: %o', value);
	    return value;
	}

	throw new TexInternalError ('unrecognized valtype %o', valtype);
    };

    Value.ensure_unboxed = function Value_ensure_unboxed (valtype, value) {
	if (valtype == T_INT) {
	    if (value instanceof TexInt)
		value = value.value_I;
	    return nlib.check__N_I (value);
	}

	if (valtype == T_DIMEN) {
	    if (value instanceof Dimen)
		return value.sp_S;
	    return nlib.check__N_S (value);
	}

	return Value.ensure_boxed (valtype, value);
    };

    return Value;
}) ();


var Valref = (function Valref_closure () {
    // A Valref is a reference to a value. It can be retrieved or overwritten,
    // giving us a generic system for implementing commands such as \advance.

    function Valref (valtype) {
	this.valtype = valtype;
    }

    var proto = Valref.prototype;

    proto.get = function Valref_get (engine) {
	// Retrieve the actual value of this reference. Typically involves
	// scanning tokens in the engine. May return null if there's no value
	// but that situation is expected.
	throw new TexInternalError ('not implemented Valref.get');
    };

    proto.set = function Valref_set (engine, value) {
	// Assign a new value to the storage location that this reference
	// represents.
	throw new TexInternalError ('not implemented Valref.set');
    };

    return Valref;
}) ();


var Listable = (function Listable_closure () {
    // A Listable is something that can be put in a horizontal, vertical, or
    // math list.

    function Listable () {
	this.ltype = null;
    }

    var proto = Listable.prototype;

    proto._uisummary = function Listable__uisummary () {
	// Returns a short string summarizing this object; used in toString()
	// and uitext().
	return 'Listable without _uisummary??';
    };

    proto.toString = function Listable_toString () {
	return '<' + this._uisummary () + '>';
    };

    proto._uiitems = function Listable__uiitems () {
	// Returns list of strings describing this item, to be displayed
	// separated by newlines. Default is good for most:
	return [this._uisummary ()];
    };

    proto.uitext = function Listable_uitext () {
	return this._uiitems ().join ('\n');
    };

    return Listable;
}) ();


var Command = (function Command_closure () {
    // A Command is a TeX primitive command. Most commands are bound to a
    // single control sequence in the default engine, but there is not a
    // one-to-one mapping between commands and cseqs: a cseq may be rebound so
    // that it points to the same command as another, and operations like
    // \chardef may create new commands that are not precisely associated with
    // any single cseq.

    function Command () {}

    var proto = Command.prototype;
    proto.expandable = false;
    proto.conditional = false;
    proto.boxlike = false; // TODO: can probably be removed
    proto.multi_instanced = false; // can multiple Command instances with the same name exist?
    proto.prefixing_mode = Prefixing.MODE_NONE;
    proto.name = '<unset command name>';

    proto.toString = function Command_toString () {
	return '[' + this.name + ']';
    };

    proto.texmeaning = function Command_texmeaning (engine) {
	return texchr (engine.escapechar__I ()) + this.name;
    };


    proto.invoke = function Command_invoke (engine) {
	throw new TexInternalError ('tried to evaluate undefined/' +
				    'un-evaluatable command %s', this.name);
    };

    proto.same_cmd = function Command_same_cmd (other) {
	if (other == null)
	    return false;
	return this.name == other.name;
    };

    // Value conversions

    proto.get_valtype = function Command_get_valtype () {
	// Return the type of the value that this command yields, or null if
	// not applicable. Needed so that \the can peek and see whether it's
	// about to get a token list so that xdef can do the right thing.
	// Otherwise, some kinds of as_valref() calls will eat tokens that
	// don't get put back into the parser when \the decides to do nothing
	// unusual.
	return null;
    };

    proto.as_valref = function Command_as_valref (engine) {
	return null;
    };

    proto.as_int__I = function Command_as_int__I (engine) {
	var v = this.as_valref (engine);
	if (v == null)
	    return null;
	return v.get (engine).as_int__I ();
    };

    proto.as_scaled__S = function Command_as_scaled__S (engine) {
	var v = this.as_valref (engine);
	if (v == null)
	    return undefined; // see comment in TexInt.as_scaled__S
	return v.get (engine).as_scaled__S ();
    };

    proto.as_glue = function Command_as_glue (engine) {
	var v = this.as_valref (engine);
	if (v == null)
	    return null;
	return v.get (engine).as_glue ();
    };

    // Serialization.

    proto.get_serialize_ident = function Command_get_serialize_ident (state, housekeeping) {
	if (this._serialize_ident == null) {
	    if (!this.multi_instanced) {
		// Builtin unique command, no need to serialize anything. Just
		// need to remember that it exists.
		if (housekeeping.commands.hasOwnProperty (this.name))
		    throw new TexRuntimeError ('multiple commands with name %s',
					       this.name);
		housekeeping.commands[this.name] = true;
		this._serialize_ident = this.name;
	    } else {
		// Command is not unique. We need to give this particular
		// instance a special name and save its unique, special
		// parameters.

		var data = this._serialize_data (state, housekeeping);
		var cmdlist = null;

		if (!state.commands.hasOwnProperty (this.name))
		    cmdlist = state.commands[this.name] = [];
		else
		    cmdlist = state.commands[this.name];

		this._serialize_ident = this.name + '/' + cmdlist.length;
		cmdlist.push (data);
	    }
	}

	return this._serialize_ident;
    };

    proto._serialize_data = function Command__serialize_data (state, housekeeping) {
	throw new TexRuntimeError ('_serialize_data not implemented for command');
    };

    return Command;
})();


var AssignmentCommand = (function AssignmentCommand_closure () {
    function AssignmentCommand () {
	Command.call (this);
    }

    inherit (AssignmentCommand, Command);
    var proto = AssignmentCommand.prototype;
    proto.prefixing_mode = Prefixing.MODE_ASSIGNMENT;

    proto.invoke = function AssignmentCommand_invoke (engine) {
	var as_valref = this.as_valref (engine);
	engine.scan_optional_equals ();
	var newval = engine.scan_valtype (this.get_valtype ());
	engine.trace ('%s = %o', this.name, newval);
	as_valref.set (engine, newval);
    };

    return AssignmentCommand;
})();


// Registry of command specifications.

var register_command = (function register_command_wrapper () {
    var commands = {};

    function register_command (name, value) {
	if (commands[name] != null)
	    throw new TexInternalError ('duplicate registration of command "%s"', name);

	commands[name] = value;
    }

    register_command._registry = commands;

    return register_command;
}) ();

function register_assignment_command (name, valtype, as_valref) {
    var cmd = new AssignmentCommand ();
    cmd.name = name;
    cmd.get_valtype = function () { return valtype; };
    cmd.as_valref = as_valref.bind (cmd);
    register_command (name, cmd);
}

var register_command_deserializer = (function register_command_deserializer_wrapper () {
    var deserializers = {};

    function register_command_deserializer (name, value) {
	if (deserializers[name] != null)
	    throw new TexInternalError ('duplicate registration of command ' +
					'deserializer "%s"', name);

	deserializers[name] = value;
    }

    register_command_deserializer._registry = deserializers;

    return register_command_deserializer;
}) ();


// We don't actually define the Engine class here, but we define hooks for
// extending it in various ways. This lets us have the convenience of being
// able to call methods on the Engine without having to have a giant file that
// defines everything all at once.

var engine_proto = (function engine_proto_wrapper () {
    function EnginePrototype () {
	this.engine_methods = {};
	this.nesting_methods = {};
	this.state_items = [];
    }

    var proto = EnginePrototype.prototype;

    proto.register_method = function EnginePrototype_register_method (name, func) {
	if (typeof func !== 'function')
	    throw new TexInternalError ('unexpected register_method() arg %o', func);

	if (this.engine_methods.hasOwnProperty (name))
	    throw new TexInternalError ('reregistring Engine method "%s"', name);

	this.engine_methods[name] = func;
	return func; // convenience
    };

    proto._apply_methods = function EnginePrototype__apply_methods (engproto) {
	for (var stem in this.engine_methods) {
	    if (!this.engine_methods.hasOwnProperty (stem))
		continue;

	    engproto[stem] = this.engine_methods[stem];
	}
    };


    proto.register_nesting_method = function EnginePrototype_register_nesting_method (name, func) {
	if (typeof func !== 'function')
	    throw new TexInternalError ('unexpected register_nesting_method() arg %o', func);

	if (this.nesting_methods.hasOwnProperty (name))
	    throw new TexInternalError ('reregistring EquivTable method "%s"', name);

	this.nesting_methods[name] = func;
	return func; // convenience
    };

    proto._apply_nesting_methods = function EnginePrototype__apply_nesting_methods (eqtbproto) {
	for (var stem in this.nesting_methods) {
	    if (!this.nesting_methods.hasOwnProperty (stem))
		continue;

	    eqtbproto[stem] = this.nesting_methods[stem];
	}
    };


    proto.register_state = function EnginePrototype_register_state (info) {
	if (typeof info !== 'object')
	    throw new TexInternalError ('unexpected register_state() arg %o', info);

	this.state_items.push (info);
    };

    proto._call_state_funcs = function EnginePrototype__call_state_funcs (name/*, ...implicit*/) {
	var args = Array.prototype.slice.call (arguments, 1);

	for (var i = 0; i < this.state_items.length; i++) {
	    var func = this.state_items[i][name];

	    if (func != null)
		func.apply (null, args);;
	}
    };

    proto._is_clean = function EnginePrototype__is_clean (engine) {
	for (var i = 0; i < this.state_items.length; i++) {
	    var func = this.state_items[i].is_clean;

	    if (func == null)
		continue

	    var r = func (engine);
	    if (!r)
		return false;
	}

	return true;
    };

    // Note that we return a singleton object, and not the class.
    return new EnginePrototype ();
}) ();

var EquivTable = (function EquivTable_closure () {
    function EquivTable (parent) {
	this.parent = parent;

	if (parent == null) {
	    this.toplevel = this;
	    this._catcodes = new Array (256);
	} else {
	    this.toplevel = parent.toplevel;
	    this._catcodes = parent._catcodes.slice ();
	}

	this._registers = {};
	this._registers[T_INT] = {};
	this._registers[T_DIMEN] = {};
	this._registers[T_GLUE] = {};
	this._registers[T_MUGLUE] = {};
	this._registers[T_TOKLIST] = {};
	this._registers[T_BOX] = {};

	this._parameters = {};
	this._parameters[T_INT] = {};
	this._parameters[T_DIMEN] = {};
	this._parameters[T_GLUE] = {};
	this._parameters[T_MUGLUE] = {};
	this._parameters[T_TOKLIST] = {};

	this._codes = {};
	this._codes[CT_LOWERCASE] = {};
	this._codes[CT_UPPERCASE] = {};
	this._codes[CT_SPACEFAC] = {};
	this._codes[CT_MATH] = {};
	this._codes[CT_DELIM] = {};

	this._actives = {};
	this._cseqs = {};
	this._fonts = {};

	if (parent == null)
	    this._toplevel_init ();
    }

    var proto = EquivTable.prototype;

    proto.set_register = function EquivTable_set_register (valtype, reg, value) {
	if (!vt_ok_for_register[valtype])
	    throw new TexRuntimeError ('illegal value type for register: ' +
				       vt_names[valtype]);
	if (reg < 0 || reg > 255)
	    throw new TexRuntimeError ('illegal register number ' + reg);

	this._registers[valtype][reg] = Value.coerce (valtype, value);
    };

    proto.get_register = function EquivTable_get_register (valtype, reg) {
	if (!vt_ok_for_register[valtype])
	    throw new TexRuntimeError ('illegal value type for register: ' +
				       vt_names[valtype]);
	if (reg < 0 || reg > 255)
	    throw new TexRuntimeError ('illegal register number ' + reg);

	if (this._registers[valtype].hasOwnProperty (reg))
	    return this._registers[valtype][reg];
	if (this.parent == null)
	    throw new TexRuntimeError ('unset register; type=' + valtype +
				       ', number=' + reg);
	return this.parent.get_register (valtype, reg);
    };

    proto.set_parameter = function EquivTable_set_parameter (valtype, name, value) {
	if (!vt_ok_for_parameter[valtype])
	    throw new TexRuntimeError ('illegal value type for parameter: ' +
				       vt_names[valtype]);

	this._parameters[valtype][name] = Value.coerce (valtype, value);
    };

    proto.get_parameter = function EquivTable_get_parameter (valtype, name) {
	if (!vt_ok_for_parameter[valtype])
	    throw new TexRuntimeError ('illegal value type for parameter: ' +
				       vt_names[valtype]);

	if (this._parameters[valtype].hasOwnProperty (name))
	    return this._parameters[valtype][name];
	if (this.parent == null)
	    throw new TexRuntimeError ('undefined named parameter ' + name);
	return this.parent.get_parameter (valtype, name);
    };

    proto.set_code = function EquivTable_set_code (codetype, ord, value) {
	if (ord < 0 || ord > 255)
	    throw new TexRuntimeError ('illegal ordinal number ' + ord);
	if ((value < 0 && codetype != CT_DELIM) || value > ct_maxvals[codetype])
	    throw new TexRuntimeError ('illegal ' + ct_names[codetype] +
				       ' value ' + value);

	if (codetype == CT_CATEGORY)
	    this._catcodes[ord] = value;
	else
	    this._codes[codetype][ord] = value;
    };

    proto.get_code = function EquivTable_get_code (codetype, ord) {
	if (ord < 0 || ord > 255)
	    throw new TexRuntimeError ('illegal ordinal number ' + ord);

	if (codetype == CT_CATEGORY)
	    return this._catcodes[ord];

	if (this._codes[codetype].hasOwnProperty (ord))
	    return this._codes[codetype][ord];
	return this.parent.get_code (codetype, ord);
    };

    proto.get_active = function EquivTable_get_active (ord) {
	if (ord < 0 || ord > 255)
	    throw new TexRuntimeError ('illegal ordinal number ' + ord);

	if (this._actives.hasOwnProperty (ord))
	    return this._actives[ord];
	if (this.parent == null)
	    return null;
	return this.parent.get_active (ord);
    };

    proto.set_active = function EquivTable_set_active (ord, value) {
	if (ord < 0 || ord > 255)
	    throw new TexRuntimeError ('illegal ordinal number ' + ord);

	this._actives[ord] = value;
    };

    proto.get_cseq = function EquivTable_get_cseq (name) {
	if (this._cseqs.hasOwnProperty (name))
	    return this._cseqs[name];
	if (this.parent == null)
	    return null;
	return this.parent.get_cseq (name);
    };

    proto.set_cseq = function EquivTable_set_cseq (name, value) {
	this._cseqs[name] = value;
    };

    proto.get_font = function EquivTable_get_font (name) {
	if (this._fonts.hasOwnProperty (name))
	    return this._fonts[name];
	if (this.parent == null)
	    return null;
	return this.parent.get_font (name);
    };

    proto.set_font = function EquivTable_set_font (name, value) {
	this._fonts[name] = value;
    };

    proto._toplevel_init = function EquivTable__toplevel_init () {
	for (var i = 0; i < 256; i++) {
	    this._catcodes[i] = C_OTHER;
	    this._codes[CT_MATH][i] = i;
	    this._codes[CT_SPACEFAC][i] = 1000;
	    this._codes[CT_DELIM][i] = -1;
	    this._codes[CT_LOWERCASE][i] = 0;
	    this._codes[CT_UPPERCASE][i] = 0;
	    this._registers[T_INT][i] = new TexInt (0);
	    this._registers[T_DIMEN][i] = new Dimen ();
	    this._registers[T_GLUE][i] = new Glue ();
	    this._registers[T_MUGLUE][i] = new Glue ();
	    this._registers[T_TOKLIST][i] = new Toklist ();
	    this._registers[T_BOX][i] = new Box (BT_VOID);
	}

	for (var i = 0; i < 26; i++) {
	    this._catcodes[O_LC_A + i] = C_LETTER;
	    this._catcodes[O_UC_A + i] = C_LETTER;
	    this._codes[CT_MATH][O_LC_A + i] = O_LC_A + i + 0x7100;
	    this._codes[CT_MATH][O_UC_A + i] = O_UC_A + i + 0x7100;
	    this._codes[CT_UPPERCASE][O_UC_A + i] = O_UC_A + i;
	    this._codes[CT_UPPERCASE][O_LC_A + i] = O_UC_A + i;
	    this._codes[CT_LOWERCASE][O_UC_A + i] = O_LC_A + i;
	    this._codes[CT_LOWERCASE][O_LC_A + i] = O_LC_A + i;
	    this._codes[CT_SPACEFAC][O_UC_A + i] = 999;
	}

	for (var i = 0; i < 10; i++)
	    this._codes[CT_MATH][O_ZERO + i] = O_ZERO + i + 0x7000;

	this._catcodes[O_NULL] = C_IGNORE;
	this._catcodes[O_BACKSPACE] = C_INVALID;
	this._catcodes[O_RETURN] = C_EOL;
	this._catcodes[O_SPACE] = C_SPACE;
	this._catcodes[O_PERCENT] = C_COMMENT;
	this._catcodes[O_BACKSLASH] = C_ESCAPE;
	this._codes[CT_DELIM][O_PERIOD] = 0;
    };

    // Serialization. Our equivalent of the \dump primitive.

    proto.serialize = function Eqtb_serialize () {
	var state = {};
	var housekeeping = {commands: {}};
	var i = 0;
	var name = null;

	state.catcodes = this._catcodes;
	state.registers = {ints: {}, dimens: {}, glues: {}, muglues: {},
			   toklists: {}};
	state.parameters = {ints: {}, dimens: {}, glues: {}, muglues: {},
			    toklists: {}};
	state.commands = {};
	state.actives = {};

	for (i = 0; i < 256; i++) {
	    var r = this._registers[T_INT][i];
	    if (r != null && r.is_nonzero ())
		state.registers.ints[i] = r.as_serializable ();

	    r = this._registers[T_DIMEN][i];
	    if (r != null && r.is_nonzero ())
		state.registers.dimens[i] = r.as_serializable ();

	    r = this._registers[T_GLUE][i];
	    if (r != null && r.is_nonzero ())
		state.registers.glues[i] = r.as_serializable ();

	    r = this._registers[T_MUGLUE][i];
	    if (r != null && r.is_nonzero ())
		state.registers.muglues[i] = r.as_serializable ();

	    r = this._registers[T_TOKLIST][i];
	    if (r != null && r.is_nonzero ())
		state.registers.toklists[i] = r.as_serializable ();

	    //Box contents don't get serialized. I think.
	    //r = this._registers[T_BOX][i];
	    //if (r != null && r.is_nonzero ())
	    //	state.registers.boxes[i] = r.as_serializable ();

	    if (this._actives.hasOwnProperty (i))
		state.actives[i] = this._actives[i].get_serialize_ident (state, housekeeping);
	}

	// Parameters

	for (name in this._parameters[T_INT]) {
	    if (!this._parameters[T_INT].hasOwnProperty (name))
		continue;
	    if (name == 'year' || name == 'month' || name == 'day' ||
		name == 'time')
		continue;
	    state.parameters.ints[name] = this._parameters[T_INT][name].as_serializable ();
	}

	for (name in this._parameters[T_DIMEN]) {
	    if (!this._parameters[T_DIMEN].hasOwnProperty (name))
		continue;
	    state.parameters.dimens[name] = this._parameters[T_DIMEN][name].as_serializable ();
	}

	for (name in this._parameters[T_GLUE]) {
	    if (!this._parameters[T_GLUE].hasOwnProperty (name))
		continue;
	    state.parameters.glues[name] = this._parameters[T_GLUE][name].as_serializable ();
	}

	for (name in this._parameters[T_MUGLUE]) {
	    if (!this._parameters[T_MUGLUE].hasOwnProperty (name))
		continue;
	    state.parameters.muglues[name] = this._parameters[T_MUGLUE][name].as_serializable ();
	}

	for (name in this._parameters[T_TOKLIST]) {
	    if (!this._parameters[T_TOKLIST].hasOwnProperty (name))
		continue;
	    state.parameters.toklists[name] = this._parameters[T_TOKLIST][name].as_serializable ();
	}

	// Various other "codes".

	state.codes = {lower: [], upper: [], spacefac: [], math: [], delim: []};

	for (i = 0; i < 256; i++) {
	    state.codes.lower.push (this._codes[CT_LOWERCASE][i]);
	    state.codes.upper.push (this._codes[CT_UPPERCASE][i]);
	    state.codes.spacefac.push (this._codes[CT_SPACEFAC][i]);
	    state.codes.math.push (this._codes[CT_MATH][i]);
	    state.codes.delim.push (this._codes[CT_DELIM][i]);
	}

	// Fonts -- need to set these up since given-font commands can delegate here.

	state.fonts = [];

	for (name in this._fonts) {
	    if (!this._fonts.hasOwnProperty (name))
		continue;

	    // Don't need to use the return value here.
	    this._fonts[name].get_serialize_ident (state, housekeeping);
	}

	// Control seqs.

	state.cseqs = {};

	for (name in this._cseqs) {
	    if (!this._cseqs.hasOwnProperty (name))
		continue;

	    state.cseqs[name] = this._cseqs[name].get_serialize_ident (state, housekeeping);
	}

	return state;
    };

    return EquivTable;
})();


var Engine = (function Engine_closure () {
    var AF_GLOBAL = 1 << 0;
    var CS_FI = 0, CS_ELSE_FI = 1, CS_OR_ELSE_FI = 2, CS_INCONDITION = 3;
    var BO_SETBOX = 0;

    function Engine (args) {
	/* Possible properties of args:
	 *
	 * iostack - an IOStack with TeX files (required)
	 * debug_input_lines - print lines of input as they're read
	 * debug_trace - print commands as they're executed
	 * initial_linebuf - LineBuffer of the initial input (required)
	 * jobname - the TeX job name
	 * shiptarget - target that will receive \shipout{} data.
	 */

	this.jobname = args.jobname || 'texput';
	this.iostack = args.iostack;
	this.shiptarget = args.shiptarget;

	this.inputstack = new InputStack (args.initial_linebuf, this, args);
	this._force_end = false;

	this.eqtb = new EquivTable (null);

	// See TeXBook p. 271. These are global.
	this.special_values = {};
	this.special_values[T_INT] = {};
	this.special_values[T_DIMEN] = {};
	this.set_special_value (T_INT, 'spacefactor', 1000);
	this.set_special_value (T_INT, 'prevgraf', 0);
	this.set_special_value (T_INT, 'deadcycles', 0);
	this.set_special_value (T_INT, 'insertpenalties', 0);
	this.set_special_value (T_DIMEN, 'prevdepth', new Dimen ());
	this.set_special_value (T_DIMEN, 'pagegoal', new Dimen ());
	this.set_special_value (T_DIMEN, 'pagetotal', new Dimen ());
	this.set_special_value (T_DIMEN, 'pagestretch', new Dimen ());
	this.set_special_value (T_DIMEN, 'pagefilstretch', new Dimen ());
	this.set_special_value (T_DIMEN, 'pagefillstretch', new Dimen ());
	this.set_special_value (T_DIMEN, 'pagefilllstretch', new Dimen ());
	this.set_special_value (T_DIMEN, 'pageshrink', new Dimen ());
	this.set_special_value (T_DIMEN, 'pagedepth', new Dimen ());

	this.mode_stack = [M_VERT];
	this.build_stack = [[]];
	this.group_exit_stack = [];
	this.boxop_stack = [];
	this.conditional_stack = [];

	this.assign_flags = 0;
	this.after_assign_token = null;

	this.infiles = [];
	this.outfiles = [];
	for (var i = 0; i < 16; i++) {
	    this.infiles[i] = null;
	    this.outfiles[i] = null;
	}

	this.commands = {};
	fill_cseq_commands (this);
	engine_init_parameters (this);
	engine_init_param_cseqs (this);
	this.commands['<space>'] = new Command.catcode_commands[C_SPACE] (O_SPACE);
	this.commands['<end-group>'] = new Command.catcode_commands[C_EGROUP] (O_LEFT_BRACE);

	// T:TP sec 240; has to go after $init_parameters
	this.set_parameter (T_INT, 'mag', 1000);
	this.set_parameter (T_INT, 'tolerance', 1000);
	this.set_parameter (T_INT, 'hangafter', 1);
	this.set_parameter (T_INT, 'maxdeadcycles', 25);
	this.set_parameter (T_INT, 'escapechar', O_BACKSLASH);
	this.set_parameter (T_INT, 'endlinechar', O_RETURN);

	var d = new Date ();
	this.set_parameter (T_INT, 'year', d.getFullYear ());
	this.set_parameter (T_INT, 'month', d.getMonth ());
	this.set_parameter (T_INT, 'day', d.getDay ());
	this.set_parameter (T_INT, 'time', d.getHours () * 60 + d.getMinutes ());

	var nf = new Font ('nullfont', -1000);
	this.set_font ('<null>', nf);
	this.set_font ('<current>', nf);

	if (args.debug_trace)
	    this.trace = function (t) { global_log ('{' + t + '}'); };
	else
	    this.trace = function (t) {};
    }

    var proto = Engine.prototype;

    // Wrappers for the EquivTable.

    proto.get_register = function Engine_get_register (valtype, reg) {
	return this.eqtb.get_register (valtype, reg);
    };

    proto.set_register = function Engine_get_register (valtype, reg, value) {
	if (this.assign_flags & AF_GLOBAL)
	    this.eqtb.toplevel.set_register (valtype, reg, value);
	else
	    this.eqtb.set_register (valtype, reg, value);
	this.maybe_insert_after_assign_token ();
    };

    proto.get_parameter = function Engine_get_parameter (valtype, name) {
	return this.eqtb.get_parameter (valtype, name);
    };

    proto.set_parameter = function Engine_get_parameter (valtype, name, value) {
	if (this.assign_flags & AF_GLOBAL)
	    this.eqtb.toplevel.set_parameter (valtype, name, value);
	else
	    this.eqtb.set_parameter (valtype, name, value);
	this.maybe_insert_after_assign_token ();
    };

    proto.get_code = function Engine_get_code (valtype, ord) {
	return this.eqtb.get_code (valtype, ord);
    };

    proto.set_code = function Engine_get_code (valtype, ord, value) {
	if (this.assign_flags & AF_GLOBAL)
	    this.eqtb.toplevel.set_code (valtype, ord, value);
	else
	    this.eqtb.set_code (valtype, ord, value);
	this.maybe_insert_after_assign_token ();
    };

    proto.get_active = function Engine_get_active (ord) {
	return this.eqtb.get_active (ord);
    };

    proto.set_active = function Engine_get_active (ord, value) {
	if (this.assign_flags & AF_GLOBAL)
	    this.eqtb.toplevel.set_active (ord, value);
	else
	    this.eqtb.set_active (ord, value);
	this.maybe_insert_after_assign_token ();
    };

    proto.get_cseq = function Engine_get_cseq (name) {
	return this.eqtb.get_cseq (name);
    };

    proto.set_cseq = function Engine_get_cseq (name, cmd) {
	if (this.assign_flags & AF_GLOBAL)
	    this.eqtb.toplevel.set_cseq (name, cmd);
	else
	    this.eqtb.set_cseq (name, cmd);
	this.maybe_insert_after_assign_token ();
    };

    proto.get_font = function Engine_get_font (name) {
	return this.eqtb.get_font (name);
    };

    proto.set_font = function Engine_get_font (name, value) {
	if (this.assign_flags & AF_GLOBAL)
	    this.eqtb.toplevel.set_font (name, value);
	else
	    this.eqtb.set_font (name, value);
	this.maybe_insert_after_assign_token ();
    };

    proto.get_special_value = function Engine_get_special_value (valtype, name) {
	return this.special_values[valtype][name];
    };

    proto.set_special_value = function Engine_set_special_value (valtype, name, value) {
	this.special_values[valtype][name] = Value.coerce (valtype, value);
    };

    // Infrastructure.

    proto.warn = function Engine_warn (text) {
	global_warn ('!! ' + text);
    };

    // Driving everything

    proto.step = function Engine_step () {
	var initial_is = this.inputstack.clone ();

	var tok = this.next_x_tok ();
	if (tok === EOF)
	    return tok;

	if (tok === NeedMoreData) {
	    // Reset to where we were at the beginning of the step.
	    this.inputstack = initial_is;
	    return tok;
	}

	try {
	    var cmd = tok.tocmd (this);
	    cmd.invoke (this);
	} catch (e) {
	    if (e === NeedMoreData) {
		this.inputstack = initial_is;
		return NeedMoreData;
	    }
	    if (e === EOF)
		throw new TexRuntimeError ('unexpected EOF while parsing');
	    throw e;
	}

	if (cmd.assign_flag_mode == AFM_INVALID && this.assign_flags)
	    this.warn ('assignment flags applied to inapplicable command ' + cmd);
	else if (cmd.assign_flag_mode != AFM_CONTINUE)
	    this.assign_flags = 0;

	// We successfully completed this step, so we can throw away any old
	// tokens we were holding on to. We also throw away the saved
	// initial_is since we don't need to go back to it.
	this.inputstack.checkpoint ();
	return true;
    };

    // Mode and grouping stuff.

    proto.nest_eqtb = function Engine_nest_eqtb () {
	this.eqtb = new EquivTable (this.eqtb);
    };

    proto.unnest_eqtb = function Engine_unnest_eqtb () {
	this.eqtb = this.eqtb.parent;
	if (this.eqtb == null)
	    throw new TexInternalError ('unnested eqtb too far');
    };

    proto.mode = function Engine_mode () {
	return this.mode_stack[this.mode_stack.length - 1];
    };

    proto.enter_mode = function Engine_enter_mode (mode) {
	this.trace ('<enter ' + mode_abbrev[mode] + ' mode>');
	this.mode_stack.push (mode);
	this.build_stack.push ([]);
    };

    proto.leave_mode = function Engine_leave_mode () {
	var oldmode = this.mode_stack.pop ();
	var list = this.build_stack.pop ();
	this.trace ('<leave ' + mode_abbrev[oldmode] + ' mode: ' +
		    list.length + ' items>');
	return list;
    };

    proto.ensure_horizontal = function Engine_ensure_horizontal () {
	if (this.mode () == M_VERT)
	    this.begin_graf (true);
	else if (this.mode () == M_IVERT)
	    this.enter_mode (M_RHORZ);
    };

    proto.ensure_vertical = function Engine_ensure_vertical () {
	if (this.mode () != M_VERT && this.mode () != M_IVERT)
	    this.enter_mode (M_IVERT);
    };

    proto.handle_bgroup = function Engine_handle_bgroup () {
	this.trace ('< ---> simple>');
	this.nest_eqtb ();
	this.group_exit_stack.push ([this.unnest_eqtb.bind (this), []]);
    };

    proto.handle_egroup = function Engine_handle_egroup () {
	if (!this.group_exit_stack.length)
	    throw new TexRuntimeError ('ending a group that wasn\'t started');

	var info = this.group_exit_stack.pop (); // [callback, aftergroup-toklist]
	info[0] (this);
	this.push_toks (info[1]);
    };

    proto.handle_begingroup = function Engine_handle_begingroup () {
	this.trace ('< ---> semi-simple>');
	this.nest_eqtb ();

	function end_semisimple (eng) {
	    throw new TexRuntimeError ('expected \\endgroup but got something ' +
				       'else');
	}
	end_semisimple.is_semisimple = true;

	this.group_exit_stack.push ([end_semisimple, []]);
    };

    proto.handle_endgroup = function Engine_handle_endgroup () {
	if (!this.group_exit_stack.length)
	    throw new TexRuntimeError ('stray \\endgroup');

	var info = this.group_exit_stack.pop ();
	if (info[0].is_semisimple !== true)
	    throw new TexRuntimeError ('got \\endgroup when should have ' +
				       'gotten other group-ender');

	this.trace ('< <--- semi-simple>');
	this.unnest_eqtb ();
	this.push_toks (info[1]);
    };

    proto.handle_aftergroup = function Engine_handle_aftergroup (tok) {
	var l = this.group_exit_stack.length;
	if (l == 0)
	    throw new TexRuntimeError ('cannot call \\aftergroup outside of a group');

	this.group_exit_stack[l - 1][1].push (tok);
    };

    proto.begin_graf = function Engine_begin_graf (indent) {
	// T:TP 1091. Due to our different page-builder approach,
	// we run it unconditionally at the top of the function,
	// before doing the stuff to start the next paragraph.
	this.trace ('@ new paragraph - run page builder');
	this.run_page_builder ();

	this.set_special_value (T_INT, 'prevgraf', 0);

	if (this.mode () == M_VERT || this.build_stack[this.build_stack.length-1].length)
	    this.accum (new BoxGlue (this.get_parameter (T_GLUE, 'parskip')));

	this.enter_mode (M_HORZ);
	this.set_special_value (T_INT, 'spacefactor', 1000);

	this.accum (new StartTag ('p', {})); // webtex special!

	if (indent) {
	    var b = new Box (BT_HBOX);
	    b.width = this.get_parameter (T_DIMEN, 'parindent');
	    this.accum (b);
	}

	var tl = this.get_parameter (T_TOKLIST, 'everypar');
	if (!tl.toks.length)
	    this.trace ('@ everypar: empty');
	else {
	    this.trace ('@ everypar: ' + tl.as_serializable ());
	    this.push_toks (tl.toks);
	}
    };

    proto.end_graf = function Engine_end_graf () {
	// T:TP 1070.
	if (this.mode () != M_HORZ)
	    return;

	this.handle_un_listify (LT_GLUE);
	var list = this.leave_mode ();
	if (!list.length)
	    return;

	list.push (new Penalty (new TexInt (10000)));
	list.push (new BoxGlue (this.get_parameter (T_GLUE, 'parfillskip')));
	list.push (new EndTag ('p')); // webtex special!
	// skip: linebreaking
	var hbox = new Box (BT_HBOX);
	hbox.list = list;
	// skip: interline glue and penalties
	this.accum (hbox);
	this.run_page_builder ();

	this.set_parameter (T_INT, 'looseness', 0);
	this.set_parameter (T_DIMEN, 'hangindent', new Dimen ());
	this.set_parameter (T_INT, 'hangafter', 1);
	// TODO: clear \parshape info, which nests in the EqTb.
    };

    // List-building.

    proto.accum = function Engine_accum (item) {
	this.build_stack[this.build_stack.length - 1].push (item);

	// spacefactor management. TeXBook p. 76.

	if (item.ltype == LT_CHARACTER) {
	    var prevsf = this.get_special_value (T_INT, 'spacefactor');
	    var thissf = this.get_code (CT_SPACEFAC, item.ord);
	    var newsf = null;

	    if (thissf == 1000) {
		newsf = 1000;
	    } else if (thissf < 1000) {
		if (thissf > 0)
		    newsf = thissf;
	    } else if (prevsf < 1000) {
		newsf = 1000;
	    } else {
		newsf = thissf;
	    }

	    if (newsf != null)
		this.set_special_value (T_INT, 'spacefactor', newsf);
	} else if (item instanceof Boxlike) {
	    this.set_special_value (T_INT, 'spacefactor', 1000);
	}
    };

    proto.accum_list = function Engine_accum_list (list) {
	// unhbox and friends do not cause \prevdepth etc. to be computed, so we don't
	// process individual items.
	Array.prototype.push.apply (this.build_stack[this.build_stack.length - 1],
				    list);
    };

    proto.run_page_builder = function Engine_run_page_builder () {
	// Real TeX pays attention to the height of the page-in-progress and
	// decides to break with a bunch of complex logic. We don't need any
	// of that because the whole point is that computer monitors don't
	// need pagination! So in Webtex the page builder has to be explicitly
	// called.
	if (this.mode () != M_VERT)
	    throw new TexInternalError ('tried to build page outside of vertical mode');
	if (this.build_stack.length != 1)
	    throw new TexInternalError ('vertical mode is not deepest?')

	if (this._running_output)
	    return; // T:TP 994.

	// Hacky version of \outputpenalty setting -- TeXBook p. 125. We should
	// preserve the penalty for the next batch of output, but since (I think)
	// we don't need it for anything, we just pop it off the list.

	var list = this.build_stack[0];
	var l = list.length;

	if (l > 0 && list[l-1].ltype == LT_PENALTY) {
	    this.set_parameter (T_INT, 'outputpenalty', list[l-1].amount);
	    list.pop ();
	} else {
	    this.set_parameter (T_INT, 'outputpenalty', 10000);
	}

	// See TeXBook p. 125.

	var vbox = new Box (BT_VBOX);
	vbox.list = list;
	this.set_register (T_BOX, 255, vbox);
	this.build_stack[0] = [];
	this._running_output = true;

	function finish_output (eng) {
	    this.trace ('< <--- output routine>');
	    this.end_graf ();
	    this.unnest_eqtb ();
	    this._running_output = false;
	    // TODO: deal with held-over insertions, etc. T:TP 1026.
	};

	var outtl = this.get_parameter (T_TOKLIST, 'output');
	this.trace ('< ---> output routine>');
	this.trace ('*output -> ' + outtl.as_serializable ());
	this.trace ('*box255 = ' + vbox.uitext ());
	this.nest_eqtb ();
	this.group_exit_stack.push ([finish_output.bind (this), []]);
	this.push (Token.new_cmd (this.commands['<end-group>']));
	this.push_toks (outtl.toks);

	// Not happy about this recursion but other functions really want the
	// page builder to operate atomically.

	while (this._running_output)
	    this.step ();
    };

    proto.ship_it = function Engine_ship_it (box) {
	this.trace ('shipping out');
	this.shiptarget.process (box);
    };

    proto.handle_un_listify = function Engine_handle_unskip (targtype) {
	// TODO?: TeXBook p. 280: not allowed in vmode if main vertical list
	// has been entirely contributed to current page.

	var l = this.build_stack.length;
	if (l == 0)
	    return;

	var list = this.build_stack[l - 1];
	l = list.length;
	if (l == 0)
	    return;

	if (list[l - 1].ltype == targtype)
	    list.pop ();
    };


    // Input nesting and other I/O

    proto.handle_input = function Engine_handle_input (texfn) {
	var lb = this.iostack.try_open_linebuffer (texfn);
	if (lb == null)
	    throw new TexRuntimeError ('can\'t find any matching files for "' +
				       texfn + '"');
	this.inputstack.push_linebuf (lb);
    };

    proto.handle_endinput = function Engine_handle_endinput () {
	this.inputstack.pop_current_linebuf ();
    };

    proto.handle_end = function Engine_handle_end () {
	// See the TeXBook end of Ch. 23 (p. 264). Terminate if main vertical
	// list is empty and \deadcycles=0. Otherwise insert '\line{} \vfill
	// \penalty-'10000000000' into the main vertical list and reread the
	// \end. \line{} is \hbox to\hsize{}.

	if (this.build_stack[0].length == 0 &&
	    this.get_special_value (T_INT, 'deadcycles').value == 0) {
	    this.trace ('... completely done');
	    this._force_end = true;
	} else {
	    this.trace ('... forcing page build');

	    var hb = new Box (BT_HBOX);
	    hb.width = this.get_parameter (T_DIMEN, 'hsize');
	    this.accum (hb);

	    var g = new Glue ();
	    g.stretch.sp = Scaled.new_from_parts (1, 0);
	    g.stretch_order = 2;
	    this.accum (new BoxGlue (g));

	    this.accum (new Penalty (-1073741824));

	    this.push (Token.new_cmd (this.commands['end']));
	    this.run_page_builder ();
	}
    };

    proto.infile = function Engine_infile (num) {
	if (num < 0 || num > 15)
	    throw new TexRuntimeError ('illegal input file number ' + num);
	return this.infiles[num];
    };

    proto.set_infile = function Engine_set_infile (num, value) {
	if (num < 0 || num > 15)
	    throw new TexRuntimeError ('illegal input file number ' + num);
	this.infiles[num] = value;
    };

    proto.outfile = function Engine_outfile (num) {
	if (num < 0 || num > 15)
	    throw new TexRuntimeError ('illegal output file number ' + num);
	return this.outfiles[num];
    };

    proto.set_outfile = function Engine_set_outfile (num, value) {
	if (num < 0 || num > 15)
	    throw new TexRuntimeError ('illegal output file number ' + num);
	this.outfiles[num] = value;
    };


    // Serialization. Our equivalent of the \dump primitive.

    proto._check_clean = function Engine__check_clean () {
	// For now (?), we're very restrictive about what state we can be in
	// when (de)serializing engine state.

	if (this.inputstack.inputs.length > 1)
	    throw new TexRuntimeError ('can only serialize Engine at topmost input');
	if (this.eqtb.parent !== null)
	    throw new TexRuntimeError ('can only serialize Engine in topmost eqtb');
	if (this.mode_stack.length > 1)
	    throw new TexRuntimeError ('can only serialize Engine in topmost mode');
	if (this.build_stack.length > 1 || this.build_stack[0].length > 0)
	    throw new TexRuntimeError ('cannot serialize Engine with queued build items');
	if (this.group_exit_stack.length > 0)
	    throw new TexRuntimeError ('can only serialize Engine without open groups');
	if (this.boxop_stack.length > 0)
	    throw new TexRuntimeError ('can only serialize Engine without open boxops');
	if (this.assign_flags != 0)
	    throw new TexRuntimeError ('cannot serialize Engine with active assignment flags');
	if (this.after_assign_token != null)
	    throw new TexRuntimeError ('cannot serialize Engine with active ' +
				       'after_assign_token');
	if (this.conditional_stack.length > 0)
	    throw new TexRuntimeError ('can only serialize Engine without open conditionals');
	for (var i = 0; i < 16; i++)
	    if (this.infiles[i] != null)
		throw new TexRuntimeError ('cannot serialize Engine with open input files');
    };

    proto.serialize = function Engine_serialize () {
	this._check_clean ();

	// We don't actually need to add anything here beyond what's taken
	// care of in the eqtb.
	return this.eqtb.serialize ();
    };

    var command_ctors = {
	'<begin-group>': BeginGroupCommand.deserialize,
	'<end-group>': EndGroupCommand.deserialize,
	'<given-char>': GivenCharCommand.deserialize,
	'<given-count>': function deserialize_count (data, hk) {
	    return new GivenRegisterCommand (T_INT, 'count', parseInt (data, 10));
	},
	'<given-dimen>': function deserialize_dimen (data, hk) {
	    return new GivenRegisterCommand (T_DIMEN, 'dimen', parseInt (data, 10));
	},
	'<given-font>': function deserialize_font (data, hk) {
	    return new GivenFontCommand (hk.fonts[data]);
	},
	'<given-skip>': function deserialize_skip (data, hk) {
	    return new GivenRegisterCommand (T_GLUE, 'skip', parseInt (data, 10));
	},
	'<given-toks>': function deserialize_skip (data, hk) {
	    return new GivenRegisterCommand (T_TOKLIST, 'toks', parseInt (data, 10));
	},
	'<given-mathchar>': GivenMathcharCommand.deserialize,
	'<macro>': MacroCommand.deserialize,
	'<space>': SpacerCommand.deserialize,
	'<subscript>': SubCommand.deserialize,
	'<superscript>': SuperCommand.deserialize,
	'undefined': UndefinedCommand.deserialize,
    };

    proto.restore_serialized_state = function Engine_restore_serialized_state (json) {
	this._check_clean ();

	var housekeeping = {};
	var i = 0;

	// First step is to rebuild saved fonts.

	var fontids = housekeeping.fonts = {};

	for (i = 0; i < json.fonts.length; i++)
	    fontids[i] = Font.deserialize (json.fonts[i]);

	// Next step is to rebuild all of the saved commands.

	var cmdids = housekeeping.commands = {};

	for (var kind in json.commands) {
	    var list = json.commands[kind];
	    var n = list.length;
	    var cmd = null;
	    var ctor = command_ctors[kind];

	    if (ctor == null)
		throw new TexRuntimeError ('unhandled stored command kind ' + kind);

	    for (i = 0; i < n; i++)
		cmdids[kind + '/' + i] = ctor (list[i], housekeeping);
	}

	var getcmd = function _getcmd (s) {
	    var c = this.commands[s];
	    if (c == null)
		c = cmdids[s];
	    if (c == null)
		throw new TexRuntimeError ('unresolvable command name ' + s);
	    return c;
	}.bind (this);

	// The rest we can do in about any order. We try to mirror Eqtb.serialize
	// -- it's a little bit sketchy that this function is so far from that,
	// but it seems good to take advantage of our wrapper setter functions.

	for (i = 0; i < 255; i++) {
	    this.set_code (CT_CATEGORY, i, json.catcodes[i]);
	    this.set_code (CT_LOWERCASE, i, json.codes.lower[i]);
	    this.set_code (CT_UPPERCASE, i, json.codes.upper[i]);
	    this.set_code (CT_SPACEFAC, i, json.codes.spacefac[i]);
	    this.set_code (CT_MATH, i, json.codes.math[i]);
	    this.set_code (CT_DELIM, i, json.codes.delim[i]);
	}

	for (var reg in json.registers.ints)
	    this.set_register (T_INT, parseInt (reg, 10),
			       TexInt.deserialize (json.registers.ints[reg]));

	for (var reg in json.registers.dimens)
	    this.set_register (T_DIMEN, parseInt (reg, 10),
			       Dimen.deserialize (json.registers.dimens[reg]));

	for (var reg in json.registers.glues)
	    this.set_register (T_GLUE, parseInt (reg, 10),
			       Glue.deserialize (json.registers.glues[reg]));

	for (var reg in json.registers.muglues)
	    this.set_register (T_MUGLUE, parseInt (reg, 10),
			       Glue.deserialize (json.registers.muglues[reg]));

	for (var reg in json.registers.toklists)
	    this.set_register (T_TOKLIST, parseInt (reg, 10),
			       Toklist.deserialize (json.registers.toklists[reg]));

	for (var ord in json.actives)
	    this.set_active (parseInt (ord, 10), getcmd (json.actives[ord]));

	for (var name in json.parameters.ints)
	    this.set_parameter (T_INT, name, parseInt (json.parameters.ints[name], 10));

	for (var name in json.parameters.dimens)
	    this.set_parameter (T_DIMEN, name, Dimen.deserialize (json.parameters.dimens[name]));

	for (var name in json.parameters.glues)
	    this.set_parameter (T_GLUE, name, Glue.deserialize (json.parameters.glues[name]));

	for (var name in json.parameters.muglues)
	    this.set_parameter (T_MUGLUE, name, Glue.deserialize (json.parameters.muglues[name]));

	for (var name in json.parameters.toklists)
	    this.set_parameter (T_TOKLIST, name, Toklist.deserialize (json.parameters.toklists[name]));

	for (var cseq in json.cseqs)
	    this.set_cseq (cseq, getcmd (json.cseqs[cseq]));
    };

    // Tokenization. I'd like to separate this out into its own class,
    // but there are just too many interactions between this subsystem and
    // the rest of the engine.

    proto.push = function Engine_push (tok) {
	this.inputstack.push_toklist ([tok]);
    };

    proto.push_toks = function Engine_push_toks (toks) {
	if (toks instanceof Toklist)
	    toks = toks.toks; // convenience.
	if (!(toks instanceof Array))
	    throw new TexInternalError ('illegal push_toks argument: ' + toks);
	this.inputstack.push_toklist (toks);
    };

    proto.push_string = function Engine_push_string (text) {
	var toks = [].map.call (text, function (c) {
	    if (c == ' ')
		return Token.new_char (C_SPACE, O_SPACE);
	    return Token.new_char (C_OTHER, c.charCodeAt (0));
	});
	this.inputstack.push_toklist (toks);
    };

    proto.next_tok = function Engine_next_tok () {
	if (this._force_end)
	    return EOF;
	return this.inputstack.next_tok ();
    };

    proto.next_x_tok = function Engine_next_x_tok () {
	while (1) {
	    var tok = this.next_tok ();
	    if (tok === NeedMoreData || tok === EOF)
		return tok;

	    var cmd = tok.tocmd (this);
	    if (!cmd.expandable)
		return tok;

	    if (cmd.samecmd (this.commands['noexpand'])) {
		tok = this.next_tok ();
		this.trace ('noexpand: ' + tok);
		return tok;
	    }

	    // The core source of recursion:
	    cmd.invoke (this);
	}
    };

    proto.next_tok_throw = function Engine_next_tok_throw () {
	var tok = this.next_tok ();
	if (tok === NeedMoreData || tok === EOF)
	    throw tok;
	return tok;
    };

    proto.next_x_tok_throw = function Engine_next_x_tok_throw () {
	var tok = this.next_x_tok ();
	if (tok === NeedMoreData || tok === EOF)
	    throw tok;
	return tok;
    };

    // "Scanning" -- this is slightly higher-level than tokenization, and
    // can usually end up kicking off recursive parsing and evaluation. If
    // more data are needed, this functions throw exceptions rather than
    // returning NeedMoreData.

    proto.scan_one_optional_space = function Engine_scan_one_optional_space () {
	var tok = this.next_tok ();
	if (tok === NeedMoreData)
	    throw tok;
	if (tok == EOF || tok.isspace (this))
	    return;
	this.push (tok);
    };

    proto.chomp_spaces = function Engine_chomp_spaces () {
	// T:TP sec. 406.
	while (1) {
	    var tok = this.next_x_tok ();
	    if (tok === NeedMoreData)
		throw tok;
	    if (!tok.isspace (this))
		return tok;
	}
    };

    proto.scan_left_brace = function Engine_scan_left_brace () {
	while (1) {
	    var tok = this.next_x_tok_throw ();

	    if (tok == null)
		throw new TexSyntaxError ('EOF when expected left brace');
	    if (tok.isspace (this))
		continue;
	    if (tok.iscmd (this, 'relax'))
		continue;
	    if (tok.tocmd (this) instanceof BeginGroupCommand)
		// We can't use iscmd() here because it calls samecmd(), which
		// cares about the ordinal associated with the command,
		// whereas here we don't. samecmd() needs to care about the
		// ordinal for \ifx to work as desired.
		return;

	    throw new TexSyntaxError ('expected left brace but found ' + tok);
	}
    };

    proto.scan_optional_equals = function Engine_scan_optional_equals () {
	while (1) {
	    var tok = this.next_x_tok_throw ();

	    if (tok.isspace (this))
		continue;
	    if (tok.isotherchar (O_EQUALS))
		return true;

	    // Found a non-space, non-equals.
	    this.push (tok);
	    return false;
	}
    };

    proto.scan_keyword = function Engine_scan_keyword (keyword) {
	var toupper = O_UC_A - O_LC_A, n = keyword.length;
	var i = 0, scanned = [];

	while (i < n) {
	    var tok = this.next_x_tok ();
	    if (tok === NeedMoreData)
		throw tok;
	    if (tok === EOF)
		break;

	    scanned.push (tok);

	    if (i == 0 && tok.isspace (this))
		continue; // my best interpretation of scan_keyword ...
	    else if (!tok.ischar ())
		break;

	    var o = keyword.charCodeAt (i);
	    if (tok.ord != o && tok.ord != o + toupper)
		break;
	    i += 1;
	}

	if (i == n)
	    return true; // got it

	// optional keyword not found; push back scanned tokens
	this.push_toks (scanned);
	return false;
    };

    proto._scan_signs = function Engine__scan_signs () {
	var negfactor = 1;

	while (1) {
	    var tok = this.next_x_tok_throw ();

	    if (tok.isspace (this)) {
	    } else if (tok.isotherchar (O_PLUS)) {
	    } else if (tok.isotherchar (O_MINUS)) {
		negfactor = -negfactor;
	    } else {
		return [negfactor, tok];
	    }
	}
    };

    proto.scan_int = function Engine_scan_int () {
	var t = this._scan_signs ();
	var negfactor = t[0], tok = t[1];

	if (tok.isotherchar (O_BACKTICK)) {
	    tok = this.next_tok ();
	    if (tok === NeedMoreData)
		throw tok;

	    if (tok.ischar ())
		// FIXME: possible align_state futzing
		return new TexInt (negfactor * tok.ord);

	    var csname = tok.name;
	    if (csname.length == 1)
		return new TexInt (negfactor * csname.charCodeAt (0));

	    throw new TexSyntaxError ('unhandled alpha number token ' + tok);
	}

	var v = tok.tocmd (this).as_int (this);
	if (v != null)
	    return v.intproduct (negfactor);

	// Looks like we have a literal integer

	var val = 0, sawany = false;

	if (tok.isotherchar (O_SQUOTE)) {
	    // Octal.
	    tok = this.next_x_tok ();
	    while (true) {
		if (tok === NeedMoreData)
		    throw tok;
		if (tok === EOF)
		    break;
		var v = tok.maybe_octal_value ();
		if (v < 0) {
		    this.push (tok);
		    break;
		}
		sawany = true;
		val = val * 8 + v;
		tok = this.next_x_tok ();
	    }
	} else if (tok.isotherchar (O_DQUOTE)) {
	    // Hexadecimal
	    tok = this.next_x_tok ();
	    while (true) {
		if (tok === NeedMoreData)
		    throw tok;
		if (tok === EOF)
		    break;
		var v = tok.maybe_hex_value ();
		if (v < 0) {
		    this.push (tok);
		    break;
		}
		sawany = true;
		val = val * 16 + v;
		tok = this.next_x_tok ();
	    }
	} else {
	    // Decimal
	    while (true) {
		if (tok === NeedMoreData)
		    throw tok;
		if (tok === EOF)
		    break;
		var v = tok.maybe_decimal_value ();
		if (v < 0) {
		    this.push (tok);
		    break;
		}
		sawany = true;
		val = val * 10 + v;
		tok = this.next_x_tok ();
	    }
	}

	if (!sawany)
	    throw new TexSyntaxError ('expected to see integer expression but ' +
				      'got the token ' + tok);

	if (val > 0x7FFFFFFF) {
	    this.warn ('found integer ' + val + ' greater than 2^32-1; ' +
		       'replace with that value');
	    val = 0x7FFFFFFF;
	}

	this.scan_one_optional_space ();
	return new TexInt (negfactor * val);
    };

    proto.scan_char_code = function Engine_scan_char_code () {
	// note: returns JS integer, not TexInt.
	return this.scan_int ().rangecheck (this, 0, 255).value;
    };

    proto.scan_register_num = function Engine_scan_register () {
	// note: returns JS integer, not TexInt.
	var v = this.scan_int ().value;
	if (v < 0 || v > 255)
	    throw new TexRuntimeError ('illegal register number ' + v);
	return v;
    };

    proto.scan_int_4bit = function Engine_scan_int_4bit () {
	// note: returns JS integer, not TexInt.
	return this.scan_int ().rangecheck (this, 0, 15).value;
    };

    proto.scan_dimen = function Engine_scan_dimen (mumode, infmode) {
	/* `infmode` says whether infinities are allowed. If true, the return
	 * value is [dimen, infinity_order] rather than just the dimension. */
	var t = this._scan_signs ();
	var negfactor = t[0], tok = t[1], inf_order = 0, val = null,
	    frac = 0, nonfrac = null;

	var v = tok.tocmd (this).as_valref (this);
	if (v != null) {
	    v = v.get (this);

	    if (mumode)
		throw new TexRuntimeError ('not implemented');
	    else {
		var u = v.as_dimen ();
		if (u != null) {
		    // We got a full-on dimen value; return it
		    var d = Dimen.new_product (negfactor, u.as_scaled ());
		    if (infmode)
			return [d, 0];
		    return d;
		}
		// We got an int.
		nonfrac = v.as_int ();
	    }
	}

	if (nonfrac == null) {
	    // We need to scan a literal number.
	    if (tok.isotherchar (O_PERIOD) || tok.isotherchar (O_COMMA)) {
		nonfrac = 0;
	    } else {
		this.push (tok);
		nonfrac = this.scan_int ().value;
		if (nonfrac < 0) {
		    negfactor = -negfactor;
		    nonfrac = -nonfrac;
		}
		tok = this.next_x_tok ();
	    }

	    if (tok == NeedMoreData) {
		throw tok;
	    } else if (tok == EOF) {
		/* nothing */
	    } else if (!tok.isotherchar (O_PERIOD) && !tok.isotherchar (O_COMMA)) {
		this.push (tok)
	    } else {
		// We have a fractional part to deal with.
		var digits = [];
		while (true) {
		    tok = this.next_tok ();
		    if (tok === NeedMoreData)
			throw tok;
		    if (tok === EOF)
			break;

		    var v = tok.maybe_decimal_value ();
		    if (v < 0) {
			if (!tok.isspace (this))
			    this.push (tok);
			break;
		    }
		    digits.push (v);
		}
		frac = Scaled.new_from_decimals (digits);
	    }
	}

	if (nonfrac < 0) {
	    negfactor = -negfactor;
	    nonfrac = -nonfrac;
	}

	if (this.scan_keyword ('true'))
	    throw new TexRuntimeError ('not implemented true-dimens');

	tok = this.chomp_spaces ();
	var val = tok.tocmd (this).as_scaled (this);
	var result = null;

	if (val != null) {
	    result = val.times_parts (nonfrac, frac);
	} else {
	    this.push (tok);

	    if (infmode && this.scan_keyword ('fil')) {
		inf_order = 1;
		while (this.scan_keyword ('l')) {
		    inf_order += 1;
		    if (inf_order > 3)
			throw new TexSyntaxError ('illegal infinity value ' +
						  '"fillll" or higher');
		}
		result = Scaled.new_from_parts (nonfrac, frac);
	    } else if (mumode) {
		if (this.scan_keyword ('mu'))
		    result = Scaled.new_from_parts (nonfrac, frac);
		else
		    throw new TexRuntimeError ('this quantity must have ' +
					       'dimensions of "mu"');
	    } else if (this.scan_keyword ('em')) {
		this.warn ('faking font em-width');
		v = Scaled.new_from_parts (18, 0);
		result = v.times_parts (nonfrac, frac);
	    } else if (this.scan_keyword ('ex')) {
		this.warn ('faking font ex-width');
		v = Scaled.new_from_parts (12, 0);
		result = v.times_parts (nonfrac, frac);
	    } else if (this.scan_keyword ('sp')) {
		result = new Scaled (nonfrac);
	    } else if (this.scan_keyword ('pt')) {
		result = Scaled.new_from_parts (nonfrac, frac);
	    } else {
		var num, denom;

		// Copied from T:TP sec. 458.
                if (this.scan_keyword ('in')) {
                    num = 7227;
		    denom = 100;
                } else if (this.scan_keyword ('pc')) {
                    num = 12;
		    denom = 1;
                } else if (this.scan_keyword ('cm')) {
                    num = 7227;
		    denom = 254;
                } else if (this.scan_keyword ('mm')) {
                    num = 7227;
		    denom = 2540;
                } else if (this.scan_keyword ('bp')) {
                    num = 7227;
		    denom = 7200;
                } else if (this.scan_keyword ('dd')) {
                    num = 1238;
		    denom = 1157;
                } else if (this.scan_keyword ('cc')) {
                    num = 14856;
		    denom = 1157;
                } else {
                    throw new TexSyntaxError ('expected a dimen unit but ' +
					      'didn\'t find it; next is ' + tok);
		}

		result = Scaled.new_parts_product (num, denom, nonfrac, frac);
	    }
	}

	// TODO this isn't always done.
	this.scan_one_optional_space ();

	result = Dimen.new_product (negfactor, result);
	if (infmode)
	    return [result, inf_order];
	return result;
    };

    proto.scan_glue = function Engine_scan_glue (mumode) {
	var t = this._scan_signs ();
	var negfactor = t[0], tok = t[1];

	var v = tok.tocmd (this).as_glue (this);
	if (v != null)
	    return v.intproduct (negfactor);

	var g = new Glue ();
	this.push (tok);
	g.width = this.scan_dimen (mumode, false).intproduct (negfactor);

	if (this.scan_keyword ('plus')) {
	    t = this.scan_dimen (mumode, true);
	    g.stretch = t[0];
	    g.stretch_order = t[1];
	}

	if (this.scan_keyword ('minus')) {
	    t = this.scan_dimen (mumode, true);
	    g.shrink = t[0];
	    g.shrink_order = t[1];
	}

	return g;
    };

    proto.scan_toks_value = function Engine_scan_toks_value () {
	this.scan_one_optional_space ();

	var tok = this.next_tok ();
	if (tok === NeedMoreData || tok === EOF)
	    throw tok;

	// TODO: \tokpar=<toklist register or toklist param>
	if (!tok.iscat (C_BGROUP))
	    throw new TexSyntaxError ('expected { in toklist assignment; got ' + tok);

	return this.scan_tok_group (false);
    };

    proto.scan_valtype = function Engine_scan_valtype (valtype) {
	if (valtype == T_INT)
	    return this.scan_int ();
	if (valtype == T_DIMEN)
	    // XXX we don't know what to put for infmode.
	    return this.scan_dimen (false, false);
	if (valtype == T_GLUE)
	    return this.scan_glue (false);
	if (valtype == T_MUGLUE)
	    return this.scan_glue (true);
	if (valtype == T_TOKLIST)
	    return this.scan_toks_value ();
	throw new TexInternalError ('can\'t generically scan value type ' + valtype);
    };

    proto.scan_r_token = function Engine_scan_r_token () {
	var tok = null;

	while (true) {
	    tok = this.next_tok ();
	    if (tok == null)
		throw new TexRuntimeError ('EOF when expected cseq name');
	    if (!tok.iscat (C_SPACE))
		// note: here we do NOT want tok.isspace()
		break;
	}

	if (!tok.iscslike ())
	    throw new TexRuntimeError ('expected control seq or active char;' +
				       'got ' + tok);

	if (tok.is_frozen_cs ())
	    throw new TexRuntimeError ('cannot redefined control seq ' + tok);

	return tok;
    };

    proto.scan_tok_group = function Engine_scan_tok_group (expand) {
	/* Assumes that a BGROUP has just been read in. Generates a list of
	 * tokens, possibly with expansion, until an EGROUP is encountered,
	 * accounting for nested groups of course. */

	var depth = 1, toks = [], getter = null;

	if (expand)
	    getter = this.next_x_tok.bind (this);
	else
	    getter = this.next_tok.bind (this);

	while (true) {
	    var tok = getter ();
	    if (tok === NeedMoreData || tok === EOF)
		throw tok;

	    if (tok.iscat (C_BGROUP))
		depth += 1;
	    else if (tok.iscat (C_EGROUP)) {
		depth -= 1;
		if (depth == 0)
		    break;
	    }

	    toks.push (tok);
	}

	return new Toklist (toks);
    };

    proto.scan_file_name = function Engine_scan_file_name () {
	var name = '';
	var tok = this.chomp_spaces ();

	while (1) {
	    if (tok === NeedMoreData)
		throw tok;
	    if (tok === EOF)
		break;

	    if (!tok.ischar ()) {
		this.push (tok);
		break;
	    }

	    if (tok.isspace (this))
		break;

	    name += String.fromCharCode (tok.ord);
	    tok = this.next_x_tok ();
	}

	return name;
    };


    proto.scan_streamnum = function Engine_scan_streamnum () {
	var snum = this.scan_int ().value;
	if (snum < 0 || snum > 15)
	    return 16; // NOTE: our little convention
	return snum;
    };


    // Conditionals

    proto.start_parsing_if_condition = function Engine_start_parsing_if_condition () {
	this.conditional_stack.push (CS_INCONDITION);
    };

    proto.done_parsing_if_condition = function Engine_done_parsing_if_condition () {
	while (this.conditional_stack.length) {
	    var mode = this.conditional_stack.pop ();
	    if (mode == CS_INCONDITION)
		return;

	    // This can legally happen if there was an \if inside the
	    // condition that is almost done parsing but hasn't quite wrapped
	    // up, e.g.:
	    //    \ifcase \iftrue1 \fi \else ... \fi
	    // parse_int will stop before the \fi, so that a CS_ELSE_FI will
	    // still be on conditional_stack. Everything will be all right if we just
	    // eat the \fi.
	    //
	    // This solution feels pretty hacky but we'll see whether it
	    // spirals out of control on us or not.

	    var tok = this.next_tok_throw ();
	    if (tok.iscmd (this, 'else') || tok.iscmd (this, 'fi') || tok.iscmd (this, 'or')) {
		this.conditional_stack.push (mode);
		tok.tocmd (this).invoke (this);
	    } else {
		throw new TexInternalError ('mis-nested condition guards?');
	    }
	}
    };

    proto.handle_if = function Engine_handle_if (result) {
	/* Assumes that an \if has just been read in and the result of the
         * test is `result`. We now prepare to handle the outcome. We'll have
         * to evaluate one branch and skip the other, taking care to pay
         * attention to nesting in the latter. We'll also have to swallow
         * \else and \fi tokens as appropriate. */

	if (result) {
	    /* All we need to do now is mark that we're an expecting an \else
             * or \fi, and that the else-block should be skipped if
             * encountered. */
	    this.conditional_stack.push (CS_ELSE_FI);
	    return;
	}

	if (this._if_skip_until (CS_ELSE_FI) == 'else') {
	    /* Encountered the else-block. We evaluate this part, and expect
             * to eat a \fi. */
	    this.conditional_stack.push (CS_FI);
	    return;
	}

	/* The \if was false and there's no else. We've skipped and just eaten
         * the \fi. Nothing else to do. */
    }


    proto.handle_if_case = function Engine_handle_if_case (value) {
	/* \ifcase<num> has just been read in and evaluated to `value`. We
         * want to evaluate the value'th case, or an \else, or nothing. */
	var ntoskip = value;

	while (ntoskip > 0) {
	    var found = this._if_skip_until (CS_OR_ELSE_FI);
	    if (found == 'fi')
		// Nothing left and no \else. Nothing to do.
		return;

	    if (found == 'else') {
		// We hit the else without finding our target case. We
		// want to evaluate it and then eat a \fi.
		this.conditional_stack.push (CS_FI);
		return;
	    }

	    // Hit an \or. Another case down the tubes.
	    ntoskip -= 1;
	}

	// If we're here, we must have hit our desired case! We'll have to
	// skip the rest of the cases later.
	this.conditional_stack.push (CS_OR_ELSE_FI);
    };


    proto._if_skip_until = function Engine__if_skip_until (mode) {
	var depth = 0;

	while (true) {
	    var tok = this.next_tok_throw ();

	    if (tok.iscmd (this, 'else')) {
		if (depth == 0) {
		    if (mode == CS_FI)
			throw new TexSyntaxError ('unexpected \\else');
		    this.trace ('... skipped conditional ... ' + tok);
		    return 'else';
		}
	    } else if (tok.iscmd (this, 'fi')) {
		if (depth > 0)
		    depth -= 1;
		else {
		    this.trace ('... skipped conditional ... ' + tok);
		    return 'fi';
		}
	    } else if (tok.iscmd (this, 'or')) {
		if (depth == 0) {
		    if (mode != CS_OR_ELSE_FI)
			throw new TexSyntaxError ('unexpected \\or');
		    this.trace ('... skipped conditional ... ' + tok);
		    return 'or';
		}
	    } else if (tok.isconditional (this)) {
		depth += 1;
	    }
	}

	throw new TexInternalError ('not reached');
    };


    proto.handle_or = function Engine_handle_or () {
	// We should only get here if we executed an \ifcase case and we need
	// to eat up alternate branches until the end.

	if (!this.conditional_stack.length)
	    throw new TexSyntaxError ('stray \\or');

	var mode = this.conditional_stack.pop (), skipmode = CS_OR_ELSE_FI;
	if (mode == CS_INCONDITION) {
	    // We were parsing the condition of the \ifcase and it involved
	    // some kind of open-ended expanding parsing that made it out to
	    // this \or. TeX inserts a \relax in this case to stop the
	    // expansion.
	    this.push_toks ([Token.new_cmd (this.commands['relax']),
			     Token.new_cmd (this.commands['or'])]);
	    this.conditional_stack.push (mode);
	    return;
	}

	if (mode != CS_OR_ELSE_FI)
	    throw new TexSyntaxError ('unexpected \\or');

	while (true) {
	    var found = this._if_skip_until (skipmode)
	    if (found == 'fi')
		break;
	    if (found == 'else')
		skipmode = CS_FI;
	}
    };


    proto.handle_else = function Engine_handle_else () {
	if (!this.conditional_stack.length)
	    throw new TexSyntaxError ('stray \\else');

	var mode = this.conditional_stack.pop ();
	if (mode == CS_INCONDITION) {
	    // See comment in handle_or.
	    this.push_toks ([Token.new_cmd (this.commands['relax']),
			     Token.new_cmd (this.commands['else'])]);
	    this.conditional_stack.push (mode);
	    return;
	}

	if (mode == CS_FI)
	    throw new TexSyntaxError ('unexpected (duplicate?) \\else');

	this._if_skip_until (CS_FI);
    };

    proto.handle_fi = function Engine_handle_fi () {
	if (!this.conditional_stack.length)
	    throw new TexSyntaxError ('stray \\fi');

	var mode = this.conditional_stack.pop ();
	if (mode == CS_INCONDITION) {
	    // See comment in handle_or.
	    this.push_toks ([Token.new_cmd (this.commands['relax']),
			     Token.new_cmd (this.commands['fi'])]);
	    this.conditional_stack.push (mode);
	    return;
	}

	// Otherwise, we don't care and there's nothing more to do.
    };


    // Box construction

    proto.scan_box = function Engine_scan_box (callback, is_assignment) {
	var tok = null;

	while (true) {
	    tok = this.next_x_tok_throw ();
	    if (!tok.isspace (this) && !tok.iscmd (this, 'relax'))
		break;
	}

	// TODO: deal with leader_flag and hrule stuff; should accept:
	// \box, \copy, \lastbox, \vsplit, \hbox, \vbox, \vtop

	var cmd = tok.tocmd (this);
	if (!cmd.boxlike)
	    throw new TexRuntimeError ('expected boxlike command but got ' + tok);

        this.boxop_stack.push ([callback, is_assignment]);
	cmd.start_box (this);
    };

    proto.scan_box_for_accum = function Engine_scan_box_for_accum (cmd) {
	function accum_box (engine, box) {
	    engine.trace ('... accumulate the finished box');
	    engine.accum (box);
	}

	this.boxop_stack.push ([accum_box, false]);
	cmd.start_box (this);
    };

    proto.handle_setbox = function Engine_handle_setbox (reg) {
        // We just scanned "\setbox NN =". We'll now expect a box-construction
        // expression. The TeX design is such that rather than trying to read
        // in the whole box at once, we instead remember that we were doing a
        // setbox operation.

        function set_the_box (engine, box) {
            engine.trace ('... finish setbox: #' + reg + ' = ' + box);
            engine.set_register (T_BOX, reg, box);
	}

        this.scan_box (set_the_box.bind (this), true);
    };

    proto.handle_finished_box = function Engine_handle_finished_box (box) {
	var t = this.boxop_stack.pop ();
	var boxop = t[0], isassignment = t[1];

	if (isassignment && this.after_assign_token != null) {
	    // This is an assignment expression. TODO: afterassign token
	    // in boxes gets inserted at beginning of box token list,
	    // before every[hv]box token lists (TeXbook p. 279)
	    throw new TexRuntimeError ('afterassignment for boxes');
	}

	this.trace ('finished: ' + box.uitext ());

	if (box.btype == BT_VBOX)
	    this.end_graf (); // in case we were in the middle of one. Noop if not.
	boxop (this, box);
    };

    proto._handle_box = function Engine__handle_box (boxtype, newmode) {
	var is_exact, spec;

	if (this.scan_keyword ('to')) {
	    is_exact = true;
	    spec = this.scan_dimen ();
	} else if (this.scan_keyword ('spread')) {
	    is_exact = false;
	    spec = this.scan_dimen ();
	} else {
	    is_exact = false;
	    spec = new Dimen ();
	}

	function finish_box (engine) {
	    this.trace ('< <--- ' + bt_names[boxtype] + '>');
	    this.unnest_eqtb ();
	    var box = new Box (boxtype);
	    box.list = this.leave_mode ();
	    engine.handle_finished_box (box);
	}

	this.scan_left_brace ();
	this.trace ('< ---> ' + bt_names[boxtype] + '>');
	this.enter_mode (newmode);
	this.nest_eqtb ();
	this.group_exit_stack.push ([finish_box.bind (this), []]);
    };

    proto.handle_hbox = function Engine_handle_hbox () {
	this._handle_box (BT_HBOX, M_RHORZ);
    };

    proto.handle_vbox = function Engine_handle_vbox () {
	this._handle_box (BT_VBOX, M_IVERT);
    };


    proto.get_last_listable = function Engine_get_last_listable () {
	var l = this.build_stack.length;
	if (l == 0)
	    return null;
	var c = this.build_stack[l - 1];
	l = c.length;
	if (l == 0)
	    return null;
	return c[l - 1];
    };


    // Miscellaneous

    proto.set_global_assign_mode = function Engine_set_global_assign_mode () {
	this.assign_flags |= AF_GLOBAL;
    };

    proto.set_after_assign_token =
	function Engine_set_after_assign_token (tok) {
	    this.after_assign_token = tok;
	};

    proto.maybe_insert_after_assign_token =
	function Engine_maybe_insert_after_assign_token () {
	    if (this.after_assign_token !== null) {
		this.push (this.after_assign_token);
		this.after_assign_token = null;
	    }
	};

    proto.escapechar = function Engine_escapechar () {
	return this.get_parameter (T_INT, 'escapechar').value;
    };

    return Engine;
})();

WEBTEX.Engine = Engine;

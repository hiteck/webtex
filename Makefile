builddir = build
python = python
minify = java -jar yuicompressor-2.4.8.jar
texdist = tl2013

default: all

# The engine implementations: Web Worker and Node.js backends

genlists = \
  commands.txt \
  namedparams.txt

sharedjs = \
  src/preamble.js \
  src/format.js \
  src/inflate.js \
  src/jsonparse.js \
  src/constants.js \
  src/str-utils.js \
  src/numerics.js \
  src/base-classes.js \
  src/values.js \
  src/modes.js \
  src/registers.js \
  src/parameters.js \
  src/conditionals.js \
  src/fonts.js \
  src/boxes.js \
  src/math.js \
  src/align.js \
  src/valrefs.js \
  src/token.js \
  src/linebuffer.js \
  src/ordsource.js \
  src/inputstack.js \
  src/iostack.js \
  src/command-classes.js \
  src/command-impls.js \
  $(builddir)/engine-helpers.js \
  src/engine.js \
  src/readzip.js \
  src/bundle.js

workerjs = \
  src/html-render-target.js \
  src/worker-io.js \
  src/worker-api.js

nodejs = \
  src/node-io.js \
  src/node-api.js


$(builddir)/worker-webtex.js: \
generate.py src/worker-wrapper.js $(sharedjs) $(workerjs) \
| $(builddir)
	$(python) $^ $@

$(builddir)/node-webtex.js: \
generate.py src/node-wrapper.js $(preamble) $(sharedjs) $(nodejs) \
| $(builddir)
	$(python) $^ $@

$(builddir)/%-helpers.js: \
generate.py src/%-helpers-tmpl.js $(genlists) \
| $(builddir)
	$(python) $< src/$*-helpers-tmpl.js $@

primaries += $(builddir)/worker-webtex.js $(builddir)/node-webtex.js


# The font compiler, which we need to pre-compile fonts into JavaScript
# for math rendering because this stuff is nuts.

fcjs = \
  src/preamble.js \
  src/format.js \
  src/inflate.js \
  src/jsonparse.js \
  src/str-utils.js \
  src/node-io.js \
  src/readzip.js \
  src/bundle.js \
  font-compiler/util.js \
  font-compiler/stream.js \
  font-compiler/parser.js \
  font-compiler/glyphlist.js \
  font-compiler/fonts.js \
  font-compiler/font_renderer.js \
  font-compiler/compiler-core.js

$(builddir)/font-compiler.js: \
generate.py font-compiler/compiler-wrapper.js $(fcjs) \
| $(builddir)
	$(python) $^ $@

$(builddir)/compiled-fonts.js: \
$(builddir)/font-compiler.js $(builddir)/glyph-encoding.json $(builddir)/latest.zip builtinfonts.txt \
| $(builddir)
	node $^ >$@

# The browser master, which drives the Web Worker engine and renders the
# output into the DOM.

masterjs = \
  src/preamble.js \
  src/format.js \
  src/master-object.js \
  $(builddir)/compiled-fonts.js \
  $(builddir)/master-glyph-helper.js \
  src/dom-renderer.js


$(builddir)/browser-master-webtex.js: \
generate.py src/browser-master-wrapper.js $(masterjs) \
| $(builddir)
	$(python) $^ $@

primaries += $(builddir)/browser-master-webtex.js

$(builddir)/master-glyph-helper.js: \
generate.py src/master-glyph-helper-tmpl.js $(builddir)/glyph-encoding.json \
| $(builddir)
	$(python) $^ $@

# Generating the "bundle" Zip file.
#
# We can't use $^ in the dump-format.js rules because it converts
# "./build/..." to "build/...", which breaks Node.js's explicit-module-path
# system.
#
# We do not hook up latest.zip to $(primaries) because it's annoying to always
# be rebuilding it.

bundleextras = \
  $(builddir)/latex.dump.json

$(builddir)/latex.dump.json: \
dump-format.js $(builddir)/node-webtex.min.js \
| $(builddir)
	node $< ./$(builddir)/node-webtex.min.js texpatches/$(texdist)/ \
	  latex.ltx >$@.new && mv -f $@.new $@

$(builddir)/plain.dump.json: \
dump-format.js $(builddir)/node-webtex.min.js \
| $(builddir)
	node $< ./$(builddir)/node-webtex.min.js texpatches/$(texdist)/ \
	  plain.tex >$@.new && mv -f $@.new $@

$(builddir)/latest.zip \
$(builddir)/glyph-encoding.json: \
make-tex-bundle.py packages.txt mapfiles.txt $(bundleextras) \
| $(builddir)
	$(python) $< packages.txt mapfiles.txt texcache $(builddir) texpatches $(bundleextras)

###primaries += $(builddir)/latest.zip


# Testing
#
# TODO: this test suite is currently a joke.

test: $(builddir)/node-webtex.min.js
	@cd test && ./run-all-tests.sh ../$<

fattest: $(builddir)/node-webtex.js # actually debuggable
	@cd test && ./run-all-tests.sh ../$<


# Generic helpers

all: $(primaries)

%.min.js: %.js
	$(minify) $< >$@.new && mv -f $@.new $@

$(builddir):
	mkdir -p $(builddir)

clean:
	-rm -rf $(builddir)

.PHONY: all clean default fattest test

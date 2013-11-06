var assert = require ('assert');
var wt = require (process.argv[2]).WEBTEX;

one = new wt.TexInt (1);
two = new wt.TexInt (2);

sc1 = new wt.Scaled (0x10000);
sc2 = new wt.Scaled (0x20000);

r = wt.nx_plus_y (two, two, one);
assert.equal (r.value, 5, 'math test 1');

qr = wt.xn_over_d (sc1, new wt.TexInt (8420), new wt.TexInt (4210));
assert.equal (qr[0].value, sc2.value, 'math test 2a');
assert.equal (qr[1].value, 0, 'math test 2b');

qr = wt.x_over_n (sc1, new wt.TexInt (2));
assert.equal (qr[0].value, 0x8000, 'math test 3a');
assert.equal (qr[1].value, 0, 'math test 3b');

const country = require('./index');

module.exports = (req, res) => {
    var cmd = url(req.url);
    var fn = country[cmd.method];
    var p = params(fn).map(nm => cmd[nm])
    res.end(JSON.stringify(fn.apply(country, p)));
}

function url(s) {
    var ret = {}; 
    var [, args] = s.split('?');
    if (!args) return ret;

    var r = args.split(/[&=]/);
    for (var i = 0; i < r.length; i += 2) {
        ret[r[i]] = r[i+1];
    }   
    return ret;
}

function params(f) {
    var s = f.toString();
    var re = [
        /function\s+\w+\((.*?)\)/,
        /function\s*\((.*?)\)/,
        /\((.*?)\)\s*=>/,
        /(\w+)\s*=>/
    ]
    for (var i = 0; i < re.length; i++) {
        var r = s.match(re[i]);
        if (r) return r[1].split(',');
    }
    return [];
}

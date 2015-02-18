#!/usr/bin/env node

'use strict';

var DEBUG = false;
var argv = require('argv');
var fs = require('fs');
var request = require('request');
var readlineSync = require('readline-sync');
var spawn = require('child_process').spawn;

function debug(s) { if (DEBUG) console.log(s); }

// ----------------------------------------------
// parameters definition
function defineApp() {
  argv.option({
    name: 'user',
    short: 'u',
    type: 'string',
    description: "your github's login name. This takes priority over your config.",
    example: "'cub --user craftpaperbag --token xxxxxxxxxx'",
  });

  argv.option({
    name: 'token',
    short: 't',
    type: 'string',
    description: "your github's token. This takes priority over your config.",
    example: "'cub --user craftpaperbag --token xxxxxxxxxx'",
  });

  argv.option({
    name: 'debug',
    short: 'd',
    type: 'boolean',
    description: "debug mode",
    example: "'cub i --debug'",
  });

  //
  // for issues
  //
  argv.option({
    name: 'all',
    short: 'a',
    type: 'boolean',
    description: "[only 'issues'] List all issues (also closed)",
    example: "'cub i --all'",
  });

  argv.option({
    name: 'closed-only',
    short: 'c',
    type: 'boolean',
    description: "[only 'issues'] List closed issues",
    example: "'cub i --closed-only'",
  });

  argv.option({
    name: 'open-only',
    short: 'o',
    type: 'boolean',
    description: "[only 'issues'] List open issues (default)",
    example: "'cub i --open-only'",
  });
}

// ----------------------------------------------
// get params from .cub
//   & filter argv's options

var Options = function ( o ) {
  var path = fs.realpathSync('./');  //同期でカレントディレクトリを取得
  var path = path.split('/');
  var repo = path[path.length - 1];

  this.user = o.options.user;
  this.token = o.options.token;
  this.repo = repo;

  if ( o.options.debug ) {
    DEBUG = true;
  }

  this.all = o.options.all;
  this.closedOnly = o.options['closed-only'];
  this.openOnly = o.options['open-only'];
  if ( this.closedOnly && this.openOnly ) {
    this.all = true;
  }

  this.openConfig();
  return this;
};

Options.prototype.openConfig = function () {
  var path = fs.realpathSync('./');  //同期でカレントディレクトリを取得
  var cf;

  try {
    cf = require('./.cub.json');
  } catch (e) {
    console.log('error');
    console.log(e);
    throw e;
  }

  debug(cf);

  if ( ! this.user ) { this.user = cf.user; }
  if ( ! this.token ) { this.token = cf.token; }
  if ( cf.repo ) { this.repo = cf.repo; }

  debug(this.user);
  debug(this.token);
  debug(path);
  debug(this.repo);
}

Options.prototype.getAuth = function () {
  var auth = "Basic " + new Buffer(this.user + ":" + this.token).toString("base64");
  debug(auth);
  return auth;
}

// ----------------------------------------------
// Cub
//

var Cub = function () {
  this.methods = {
    issues: {
      url: "https://api.github.com/repos/{user}/{repo}/issues",
      proc: this.procGetIssues,
      title: "issues",
    },
    issue: {
      url: "https://api.github.com/repos/{user}/{repo}/issues/{number}",
      proc: this.procGetIssue,
      title: "issue",
    },
    open: {
      url: "https://api.github.com/repos/{user}/{repo}/issues",
      proc: this.procOpenIssue,
      title: "open issue",
    },
    close: {
      url: "https://api.github.com/repos/{user}/{repo}/issues/{number}",
      proc: this.procCloseIssue,
      title: "close issue",
    },
  };
  this.aliases = {
    i: 'issues',
    o: 'open',
    c: 'close',
  };
  this.aliasesPresenter = function (command) {
    // issue
    if ( command.match(/^[0-9]+$/) ) return "issue";
    return "";
  };

  var params = argv.run();
  if ( params.targets.length < 1 ) {
    this.usageExit();
  }
  this.method = params.targets[0];
  this.targets = params.targets;

  this.options = new Options(params);

  if ( ! this.validMethod() ) {
    console.log("sorry, cub cannot use '" + this.method + "'");
    this.usageExit();
  }

  return this;
}

Cub.prototype.run = function () {
  this.printTitle();
  this.proc = this.methods[this.method].proc;
  this.proc();
}

Cub.prototype.usageExit = function () {
  console.log('  USAGE: cub [ issues | i ]         # List of issues');
  console.log('  USAGE: cub [ open | o ]           # Open new issue');
  console.log('  USAGE: cub [ issue 123 | 123 ]    # Show an issue');
  console.log('  USAGE: cub [ close 123 | c 123 ]  # Close an issue');
  console.log();
  console.log('    options help      > cub --help');
  console.log('    more informations > https://github.com/craftpaperbag/cub');
  process.exit(1);
}

Cub.prototype.createUrl = function (others) {
  var url = this.methods[this.method].url;
  url = url.replace("{user}", this.options.user);
  url = url.replace("{repo}", this.options.repo);
  for (var key in others) {
    url = url.replace('{' + key + '}', others[key]);
  }
  return url;
}

Cub.prototype.createHeader = function () {
  var headers = {
    'Authorization': this.options.getAuth(),
    'User-Agent': 'cub',
  };
  return headers;
}

Cub.prototype.printTitle = function () {
  console.log('  [' + this.options.user + '/' + this.options.repo +'] ' + this.methods[this.method].title);
}

Cub.prototype.validMethod = function () {
  if ( this.methods[this.method] ) {
    return this.method;
  }
  //
  // check aliases
  var alias = this.aliases[this.method];
  if ( alias ) {
    this.method = alias;
    return this.method;
  }
  //
  // attempt aliasesPresenter
  alias = this.aliasesPresenter(this.method);
  if ( alias ) {
    this.method = alias;
    return this.method;
  }
  //
  // no match.
  debug('no match');
  return false;
}

// ----------------------------------------------
// procs
//

Cub.prototype.request = function (opts, successCode, callback) {
  successCode = successCode || 200;
  debug('opts: ' + opts);
  debug('successCode: ' + successCode);
  request(opts, function (err, response, body) {
    //
    // !CAUTION! scope changed
    // this is not Cub's object
    if ( err || (response && response.statusCode != successCode)) {
      console.log('error: ' + err);
      if (response) {
        console.log(response.statusCode);
      }
      debug(body);
      throw err;
    }
    
    callback(body);

  });
};

Cub.prototype.procGetIssues = function () {
  var _cub = this;
  var opts = { url: _cub.createUrl(), headers: _cub.createHeader() };
  if (_cub.options.all) {
    opts.qs = {state: 'all'};
  } else if (_cub.options.closedOnly) {
    opts.qs = {state: 'closed'};
  } else if (_cub.options.openOnly) {
    opts.qs = {state: 'open'};
  }
  this.request(opts, 200, function (body) {
    //
    // !CAUTION! scope changed
    // now 'this' is not Cub object
    var issues = JSON.parse(body);
    for (var i in issues) {
      var issue = issues[i];
      var state = '' + issue.state + '  ';
          state = state.slice(0, 6);
      console.log("  " + _cub.trimIssue(issue));
    }
  });
};

Cub.prototype.trimIssue = function (issue) {
  var state = '' + issue.state + '  ';
      state = state.slice(0, 5);
  return state + "  #" + issue.number + "  " + issue.title;
};

Cub.prototype.procGetIssue = function () {
  var number;
  var _cub = this;
  for ( var i in _cub.targets ) {
    if ( _cub.targets[i].match(/^[0-9]+$/) ) {
      number = _cub.targets[i];
    }
  }
  if ( ! number ) {
    debug('error: procGetIssue number: ' + number);
    _cub.usageExit();
  }
  //
  // request
  var opts = {
    url: _cub.createUrl({number: number}),
    headers: _cub.createHeader()
  };
  debug("  url: " + opts.url);
  this.request(opts, 200, function (body) {
    var issue = JSON.parse(body);
    var lines = issue.body.split("\n");
    //          |  open   #123 issue-title
    //          |  closed #123 issue-title
    var nitch = '         | ';
    console.log(nitch);
    console.log('  ' + _cub.trimIssue(issue));
    console.log(nitch);
    for ( var i in lines ) {
      console.log(nitch + lines[i]);
    }
    console.log();
  });
}

Cub.prototype.procOpenIssue = function () {
  var _cub = this;
  var opts = {
    url: _cub.createUrl(),
    headers: _cub.createHeader(),
    method: 'POST',
  };

  var title = readlineSync.question('  title > ');
  if ( title.length === 0 ) {
    console.log('  canceled');
    return;
  }

  //
  // open vim
  //
  // TODO: 他のエディター
  var tmpfileKey = ".cubtmp"
  var path = fs.realpathSync('./');  //同期でカレントディレクトリを取得
      path += "/" + tmpfileKey + Number(new Date()) + ".md";

  var editor = spawn('vim', [path], {
    stdio: [
      process.stdin,
      process.stdout,
      process.stderr,
    ]
  });

  editor.on('exit', function (code) {
    // check exit code
    if ( code != 0 ) {
      console.log('  canceled');
      return;
    }

    // get issue body
    var issueBody;
    try {
      issueBody = fs.readFileSync(path).toString();
      // remove tmpfile
      fs.unlink(path, function (err) {
        if (err) {
          console.log('error: ' + err);
          throw err;
        }
      });
    } catch (e) {
      debug('error. it maybe "file not found"');
      console.log('  canceled');
      return;
    }

    // check issue body
    if ( issueBody.length === 0 ) {
      console.log('  canceled');
      return;
    }
    // send request
    opts.body = JSON.stringify({
      title: title,
      body: issueBody,
    });

    _cub.request(opts, 201/* Created */, function (body) {
      var number = JSON.parse(body).number;
      console.log('  #' + number + ' ' + title + ' opened');
    });
  });
};

// TODO: get issue information
// TODO: prompt y/n
// TODO: edit request (state=close)
Cub.prototype.procCloseIssue = function () {
  var _cub = this;
  var number;
  for ( var i in _cub.targets ) {
    if ( _cub.targets[i].match(/^[0-9]+$/) ) {
      number = _cub.targets[i];
    }
  }
  if ( ! number ) {
    debug('error: procCloseIssue number: ' + number);
    _cub.usageExit();
  }
  //
  // request for information
  var opts = {
    url: _cub.createUrl({number: number}),
    headers: _cub.createHeader()
  };
  this.request(opts, 200, function (body) {
    var issue = JSON.parse(body);
    console.log();
    console.log('  #' + issue.number + ' ' + issue.title);
    console.log();
    var decidion = readlineSync.question('  close?(y/n) > ');
    if ( decidion !== 'y' ) {
      console.log('  canceled');
      return;
    }
    //
    // CLOSE request
    opts.method = 'PATCH';
    opts.body = JSON.stringify({state: 'closed'});
    _cub.request(opts, 200, function (body) {
      console.log('  closed.');
      return;
    });
  });
}
//-----------------------------------------------
// main

defineApp();
var cub = new Cub();
cub.run();

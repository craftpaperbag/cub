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
    description: "your github's login name.",
    example: "'cub --user craftpaperbag --token xxxxxxxxxx'",
  });

  argv.option({
    name: 'token',
    short: 't',
    type: 'string',
    description: "your github's token.\n" +
                 "This takes priority over your config. \n" +
                 "(see https://help.github.com/articles/creating-an-access-token-for-command-line-use/)",
    example: "'cub --user craftpaperbag --token xxxxxxxxxx'",
  });
}

// ----------------------------------------------
// get params from .cub

var Options = function ( argvResult ) {
  var path = fs.realpathSync('./');  //同期でカレントディレクトリを取得
  var path = path.split('/');
  var repo = path[path.length - 1];

  this.user = argvResult.options.user;
  this.token = argvResult.options.token;
  this.repo = repo;

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
    open: {
      url: "https://api.github.com/repos/{user}/{repo}/issues",
      proc: this.procOpenIssue,
      title: "open issue",
    },
  };
  this.aliases = {
    i: 'issues',
    o: 'open',
  };

  var params = argv.run();
  if ( params.targets.length !== 1 ) {
    usageExit();
  }
  this.method = params.targets[0];

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
  console.log('  issues: list of issues');
  console.log('          $ cub [-u user] [-t token] issues');
  console.log('          $ cub [-u user] [-t token] i');
  process.exit(1);
}

Cub.prototype.createUrl = function () {
  var url = this.methods[this.method].url;
  var url = url.replace("{user}", this.options.user);
  var url = url.replace("{repo}", this.options.repo);
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
  var alias = this.aliases[this.method];
  if ( alias ) {
    this.method = alias;
    return this.method;
  }
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
  var params = {
    url: this.createUrl(),
    headers: this.createHeader(),
  };
  var _cub = this;
  var opts = { url: _cub.createUrl(), headers: _cub.createHeader() };
  this.request(opts, 200, function (body) {
    //
    // !CAUTION! scope changed
    // now 'this' is not Cub object
    var issues = JSON.parse(body);
    for (var i in issues) {
      var issue = issues[i];
      debug(issues);
      console.log("  #" + issue.number + "  " + issue.title);
    }
  });
};

// TODO: body input
Cub.prototype.procOpenIssue = function () {
  var _cub = this;
  var opts = {
    url: _cub.createUrl(),
    headers: _cub.createHeader(),
    method: 'POST',
  };

  var title = readlineSync.question('  title > ');
  if ( title.length === 0 ) {
    console.log('canceled');
    return;
  }

  //
  // open vim
  //
  // TODO: 他のエディター
  var tmpfileKey = ".cubtmp"
  var path = fs.realpathSync('./');  //同期でカレントディレクトリを取得
      path += "/" + tmpfileKey + Number(new Date()) + ".md";
  console.log("XXX:" + path); // XXX
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
      console.log('canceled');
      return;
    }

    // get issue body
    var issueBody = fs.readFileSync(path);
    console.log("body: \n" + issueBody); // XXX
    // TODO: remove tmpfile

    // check issue body
    if ( issueBody.length === 0 ) {
      console.log('canceled');
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
//-----------------------------------------------
// main

defineApp();
var cub = new Cub();
cub.run();

#!/usr/bin/env node

'use strict';

var DEBUG = false;
var argv = require('argv');
var fs = require('fs');
var request = require('request');
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
// HTTP GET ----> github api
//

var Cub = function () {
  this.methods = {
    issues: {
      url: "https://api.github.com/repos/{user}/{repo}/issues",
      proc: this.procGetIssues,
      title: "issues",
    },
  };
  this.aliases = {
    i: 'issues',
  };

  var params = argv.run();
  if ( params.targets.length !== 1 ) {
    usageExit();
  }
  this.method = params.targets[0];

  this.options = new Options(params);

  if ( this.validMethod() ) {
    this.createUrl();
    this.createHeader();
  } else {
    console.log("sorry, cub cannot use '" + this.method + "'");
    this.usageExit();
  }

  return this;
}

Cub.prototype.usageExit = function () {
  console.log('  issues: list of issues');
  console.log('          $ cub [-u user] [-t token] issues');
  console.log('          $ cub [-u user] [-t token] i');
  process.exit(1);
}

Cub.prototype.createUrl = function () {
  this.url = this.methods[this.method].url;
  this.url = this.url.replace("{user}", this.options.user).replace("{repo}", this.options.repo);
  debug(this.url);
}

Cub.prototype.createHeader = function () {
  this.headers = { 'Authorization' : this.options.getAuth(), 'User-Agent': 'cub' };
}

Cub.prototype.printTitle = function () {
  console.log('  [' + this.options.user + '/' + this.options.repo +'] ' + this.methods[this.method].title);
}

Cub.prototype.run = function () {
  this.printTitle();
  var _cub = this;
  request(
    { url: this.url, headers: this.headers },
    function (err, response, body) {
      // !CAUTION! scope changed
      // this is not Cub's object
      if ( err || (response && response.statusCode !== 200)) {
        console.log('error: ' + err);
        if (response) {
          console.log(response.statusCode);
        }
        throw err;
      }
      _cub.methods[_cub.method].proc(body);
    }
  );
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

Cub.prototype.procGetIssues = function (body) {
  var issues = JSON.parse(body);
  for (var i in issues) {
    var issue = issues[i];
    debug(issues);
    console.log("  #" + issue.number + "  " + issue.title);
  }
}
//-----------------------------------------------
// main

defineApp();
var cub = new Cub();
cub.run();

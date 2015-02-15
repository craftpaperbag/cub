#!/usr/bin/env node
'use strict';

var argv = require('argv');
var fs = require('fs');
var request = require('request');

function usage() {
  console.log('  issues: list of issues');
  console.log('          $ cub -u user -t tokennnnnn issues')
}

// ----------------------------------------------
// parameters

argv.option({
  name: 'user',
  short: 'u',
  type: 'string',
  description: "your github's login name",
  example: "'cub --user craftpaperbag --token xxxxxxxxxx'",
});

argv.option({
  name: 'token',
  short: 't',
  type: 'string',
  description: "your github's token (see https://help.github.com/articles/creating-an-access-token-for-command-line-use/)",
  example: "'cub --user craftpaperbag --token xxxxxxxxxx'",
});

var params = argv.run();

if ( params.targets.length !== 1 ) {
  usage();
  return;
}

var command = params.targets[0];
var user = params.options.user;
var token = params.options.token;

// ----------------------------------------------
// get directory name (cub regards it as repo-name)

var path = fs.realpathSync('./');  //同期でカレントディレクトリを取得
var path = path.split('/');
var repoName = path[path.length - 1]
console.log(params);
console.log(path);
console.log(repoName);
console.log(user);
console.log(token);
// ----------------------------------------------
// HTTP GET ----> github api
//

var url = "https://api.github.com/repos/{owner}/{repo}/issues";
    url = url.replace("{owner}", user);
    url = url.replace("{repo}", repoName);
console.log(url);
var auth = "Basic " + new Buffer(user + ":" + token).toString("base64");
console.log(auth);

if (command === 'issues' || command === 'i') {
  console.log('[' + user + '/' + repoName +'] issues');
  request({ url: url, headers: { 'Authorization' : auth, 'User-Agent': 'cub' } },
    function (err, response, body) {
      if ( err || (response && response.statusCode !== 200)) {
        console.log('error');
        if (response) {
          console.log(response.statusCode);
        }
        return;
      }
      console.log('issues');
      console.log(JSON.parse(body));
    }
  );
} else {
  console.log('error');
  console.log("  sorry, cub cannot use '" + command + "'");
  usage();
  return;
}
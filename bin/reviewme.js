#! /usr/bin/env node
var reviewme = require('../index');
var program = require('commander');

var configFile;

program
  .arguments('<file>')
  .action(function (file) {
    configFile = file;
  })
  .parse(process.argv);

if (typeof configFile === 'undefined') {
  console.error('No config file specified');
  process.exit(1);
}

var config = require(configFile);
reviewme.start(config);

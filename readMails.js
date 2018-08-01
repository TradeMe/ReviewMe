const  fs = require('fs');
var listOfMails = [];
var input = fs.createReadStream('mails.txt');

const  readLines = function() {
  var remaining = '';

  input.on('data', function(data) {
    remaining += data;
    var index = remaining.indexOf('\n');
    while (index > -1) {
      var line = remaining.substring(0, index);
      remaining = remaining.substring(index + 1);
      func(line);
      index = remaining.indexOf('\n');
    }
  });

  input.on('end', function() {
    if (remaining.length > 0) {
      func(remaining);
    }
  });
  return listOfMails;
}

function func(data) {
listOfMails.push(data);
}

module.exports = readLines;
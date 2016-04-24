var unzip = require('unzip');
var request = require('request');
var fs = require('fs');

function downloadAndUnzip(url, zipFile, path, callback) {
  var deferred = Promise.defer();
  var filenames = [];
  var readStream;
  if(fs.statSync(zipFile)) {
    readStream = fs.createReadStream(zipFile);
    console.log('Reading ' + zipFile);
  } else {
    readStream = request(url);
    console.error('Downloading')
  }
  readStream
  .on('error', function(error) {
    console.log('some error');
  })
  .pipe(unzip.Extract({path:path}))
  .on('error', function(error) {
    console.log('some error');
  })
  .on('entry', function(entry) {
    filenames.push(entry.path);
  })
  .on('close', function() {
    console.log('Finish');
    deferred.resolve(filenames);
  });
  return deferred.promise;
}

module.exports = downloadAndUnzip;

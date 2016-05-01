var fs = require('fs');

var request = require('request');

var parse = require('csv-parse');
var transform = require('stream-transform');
var iconv = require('iconv-lite');

var uoZipUrl = 'http://old.minjust.gov.ua/downloads/15-UFOP.zip'
var uoZipFile = '/data/edr/15-UFOP.zip';
var uoFile = '/data/edr/uo.csv';
var dataDir = '/data/edr/';

var downloadAndUnzip = require('./downloadAndUnzip');

function downloadThen(done) {
  var needToDownload = false;
  try {
    var stats = fs.statSync(uoFile);
  } catch(e) {
    needToDownload = true;
  }
  if(needToDownload) {
    console.log(uoZipFile + ' doesn\'t exist, downloading...');
    downloadAndUnzip(uoZipUrl, uoZipFile, dataDir)
    .then(function(filenames) {
      console.log('File unzipped');
      done();
    });
  } else {
    console.log('File already exists');
    done();
  }
}

downloadThen(function() {
  var socketWriter = require('./socket')();

  console.log('Reading ' + uoFile)
  var input = fs.createReadStream(uoFile);
  var parser = parse({delimiter: ';', columns: true});
  var transformer = transform(function(record) {
    console.log("transforming");
    return {
      officialName: record["Найменування"],
      name: record["Скорочена назва"],
      id: record["   "],
      edrpou: record["Код ЄДРПОУ"],
      address: record["Місцезнаходження"],
      mainPerson: record["ПІБ керівника"],
      occupation: record["Основний вид діяльності"],
      status: record["Стан"]
    };
  }, {parallel: 10,   highWaterMark: 2});
  function handleError(e, stage) {
    console.log("Error while " + stage + ": " + e.message);
  }
  input
    .on('error', function(e){handleError(e, 'reading file');})
    .on('end', function() { console.log("I'm done"); });

  var decoder = iconv.decodeStream('win1251');
  decoder
    .on('error', function(e){handleError(e, 'decoding file');})
    .on('end', function() { console.log("I'm done"); });
  parser
    .on('error', function(e){handleError(e, 'parsing csv');})
    .on('end', function() { console.log("I'm done"); })
  transformer
          .on('error', function(e){handleError(e, 'transforming csv to object');})
          .on('unpipe', function() {console.log("Transformer: UNPIPE");})
          .on('finish', function() {console.log("Transformer: finish");})
          .on('end', function() {console.log("Transformer: end");})
  socketWriter
          .on('error', function(e){
            handleError(e, 'writing to db');
            // continue piping!
            transformer
            .pipe(socketWriter);
          })
          .on('end', function() { console.log("I'm done"); })
          .on('data', function() {console.log('writing data');});
  input
  .pipe(decoder)
  .pipe(parser)
  .pipe(transformer)
  .pipe(socketWriter);
});

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
  var myWriter = require('./postgres')();

  console.log('Reading ' + uoFile)
  var input = fs.createReadStream(uoFile);
  var parser = parse({delimiter: ';', columns: true});
  var transformer = transform(function(record) {
    return {
      officialName: record["Найменування"],
      name: record["Скорочена назва"],
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
    .on('end', function() { console.log("reading file stream finished"); });

  var decoder = iconv.decodeStream('win1251');
  decoder
    .on('error', function(e){handleError(e, 'decoding file');})
    .on('end', function() { console.log("decoding stream finished"); });
  parser
  .on('error', function(e){handleError(e, 'parsing csv');})
  .on('end', function() { console.log("csv parser stream finished"); })
  transformer
  .on('error', function(e){handleError(e, 'transforming csv to object');})
  .on('unpipe', function() {console.log("Transformer: UNPIPE");})
  .on('finish', function() {console.log("Transformer: finish");})
  .on('end', function() {console.log("Transformer: end");})
  myWriter
  .on('error', function(e){
    handleError(e, 'writing to db');
    // continue piping!
    transformer
    .pipe(myWriter);
  })
  .on('end', function() { console.log("writer stream finished"); })
  input
  .pipe(decoder)
  .pipe(parser)
  .pipe(transformer)
  .pipe(myWriter);
});

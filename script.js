
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
  var io = require('sails.io.js')( require('socket.io-client') );
  io.sails.initialConnectionHeaders = {nosession: true};

  io.sails.url = 'http://edr';

  var stream = require('stream');
  var mongoWriter = new stream.Writable({objectMode: true});
  mongoWriter._write = function (chunk, encoding, done) {
    io.socket.post('/company', chunk, function(resData, jwRes) {
      if(jwRes.statusCode != 200) {
      }
      done();
    });
  };

  console.log('Reading ' + uoFile)
  var input = fs.createReadStream(uoFile);
  var parser = parse({delimiter: ';', columns: true});
  var transformer = transform(function(record, callback) {
    callback(null, {
      officialName: record["Найменування"],
      name: record["Скорочена назва"],
      id: record["   "],
      edrpou: record["Код ЄДРПОУ"],
      address: record["Місцезнаходження"],
      mainPerson: record["ПІБ керівника"],
      occupation: record["Основний вид діяльності"],
      status: record["Стан"]
    });
  }, {parallel: 10});
  input.pipe(iconv.decodeStream('win1251')).pipe(parser).pipe(transformer)
    .pipe(mongoWriter)
});

var io = require('sails.io.js')( require('socket.io-client') );
io.sails.url = 'http://edr';

var fs = require('fs');
var request = require('request');
var parse = require('csv-parse');
var transform = require('stream-transform');
var iconv = require('iconv-lite');

var uoURL = 'http://data.gov.ua/file/3924/download?token=EhxNro4J';
var uoFile = '/data/uo.csv';

function fileCheck(callback) {
  try {
    var stats = fs.statSync(uoFile);
    callback();
  } catch(e) {
    console.log(uoFile + ' doesn\'t exist, downloading...');
    download(callback);
  }
}

function download(callback) {
  var stream = request(uoURL).pipe(fs.createWriteStream(uoFile));
  stream.on('finish', callback);
}

function insert(company, callback) {
  io.socket.post('/company', company, function(resData, jwRes) {
    callback(null, {resData: resData, jwRes: jwRes});
  });
}

var mongoWriter = transform(function(record, callback) {
  insert(record, callback);
}, {parallel: 1000});

fileCheck(function() {
  var input = fs.createReadStream(uoFile);
  var parser = parse({delimiter: ';', columns: true});
  var transformer = transform(function(record, callback){
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
  }, {parallel: 1000});
  var stringify = transform(function(record, callback) {
    callback(null, JSON.stringify(record));
  });
  input.pipe(iconv.decodeStream('win1251')).pipe(parser).pipe(transformer)
    .pipe(mongoWriter)
    .pipe(stringify).pipe(process.stdout);
});

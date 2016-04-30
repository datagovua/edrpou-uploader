var insertCompany = function(company, db, callback) {
  var collection = db.collection('companies');
  collection.insertMany([
    company
  ], function(err, result) {
    if(err) { throw err; }
    callback(result);
  });
}

var MongoClient = require('mongodb').MongoClient
  , Server = require('mongodb').Server;

var db; // shared
var url = 'mongodb://mongo:27017/edr'
MongoClient.connect(url, {
  poolSize: 10, reconnectTries: 10
}, function(err, mongoClient) {
  if (err) {console.log(err);return;}
  db = mongoClient;
});


module.exports = function() {
  var stream = require('stream');

  var mongoWriter = new stream.Writable({objectMode: true});
  mongoWriter._write = function (company, encoding, done) {
    // wait for db to be set
    function defer() {
      if(db === undefined) {
        console.log('Waiting for db connection...');
        setTimeout(defer, 1000);
      } else {
        insertCompany(company, client, function(result) {
          done();
        })
      }
    }
    defer();
  }
  return mongoWriter;
}

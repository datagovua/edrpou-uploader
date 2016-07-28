var pg = require('pg')
var QueryStream = require('pg-query-stream')
var JSONStream = require('JSONStream')

pg.connect(function(err, client, done) {
  if(err) throw err;
  var query = new QueryStream('SELECT * FROM companies');
  var stream = client.query(query);
  stream.on('end', done);
  stream.pipe(process.stdout);
});

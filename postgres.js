var stream = require('stream');

var pg = require('knex')({
  client: 'pg',
  connection: process.env.PG_CONNECTION_STRING,
  pool: {
    min: 0,
    max: 7
  }
});

module.exports = function() {
  var pgWriter = new stream.Writable({
    objectMode: true, highWaterMark: 5,
    write: function(record, encoding, done) {
      pg('companies').insert(record).then(function() {
        done();
      }).catch(function(e) {
        done(new Error(JSON.stringify(e.detail)));
      });
    }
  });
  return pgWriter;
}

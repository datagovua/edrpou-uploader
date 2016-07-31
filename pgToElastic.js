var pg = require('pg')
var elastic = require('elasticsearch')
var QueryStream = require('pg-query-stream')
var ElasticsearchBulkIndexStream = require('elasticsearch-bulk-index-stream');
var transform = require('stream-transform');


var client = new pg.Client(process.env.PG_CONNECTION_STRING);
var elasticClient = new elastic.Client({
  host: process.env.ELASTIC_HOST,
});

client.connect(function(err) {
  if(err) throw err;

  var query = new QueryStream('SELECT * FROM companies ORDER BY id');
  var stream = client.query(query);
  stream.on('error', function(err) { console.log('error', err); });
  stream.on('close', function(){ client.end(); console.log('pg done'); } );

  
  var elasticStream = new ElasticsearchBulkIndexStream(elasticClient, {
    highWaterMark: process.env.BATCH_SIZE || 10000,
    flushTimeout: 500
  });

  var transformer = transform(function(record) {
    console.log('write', record.id);
    return {
      index: 'companies_index',
      type: 'companies-type',
      id: record.id,
      body: record
    };
  }, {parallel: 10,   highWaterMark: process.env.BATCH_SIZE || 10000 });

  
  stream
    .pipe(transformer)
    .pipe(elasticStream)
    .on('error', function(error) {
      console.log('error', error);
    })
    .on('finish', function() {
      console.log('elastic finish');
    });

});

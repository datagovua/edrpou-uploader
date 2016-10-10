var pg = require('pg')
var elastic = require('elasticsearch')
var QueryStream = require('pg-query-stream')
var ElasticsearchBulkIndexStream = require('elasticsearch-bulk-index-stream');
var transform = require('stream-transform');


var client = new pg.Client(process.env.PG_CONNECTION_STRING);
var elasticClient = new elastic.Client({
  host: process.env.ELASTIC_HOST,
  maxRetries: 10,
  requestTimeout: 60000
});
var query = new QueryStream('SELECT * FROM companies ORDER BY id');

client.connect(function onPgConnect(err) {
  var stream, elasticStream, transformer;
  if(err) throw err;

  stream = client.query(query);
  
  elasticStream = new ElasticsearchBulkIndexStream(elasticClient, {
    highWaterMark: process.env.BATCH_SIZE || 10000,
    flushTimeout: 500
  });

  transformer = transform(function(record) {
    console.log('write', record.id);
    return {
      index: 'companies_index',
      type: 'companies-type',
      id: record.id,
      body: Object.assign({}, record) // prevent memory leak
    };
  }, {parallel: 10,   highWaterMark: process.env.BATCH_SIZE || 10000 });


  stream.on('error', function onPgErr(err) { console.log('error', err); });
  stream.on('close', function onPgClose(){
    client.end(); console.log('pg done');
  });
  stream
    .pipe(transformer)
    .pipe(elasticStream)
    .on('error', function onEsErr(error) {
      console.log('error', error);
    })
    .on('finish', function onEsFinish() {
      console.log('elastic finish');
    });

});

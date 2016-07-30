var pg = require('pg')
var elastic = require('elasticsearch')
var QueryStream = require('pg-query-stream')
var JSONStream = require('JSONStream')
var WritableBulk = require('elasticsearch-streams').WritableBulk;
var TransformToBulk = require('elasticsearch-streams').TransformToBulk;

var client = new pg.Client(process.env.PG_CONNECTION_STRING);
var elasticClient = new elastic.Client({
  host: process.env.ELASTIC_HOST,
});

client.connect(function(err) {
  if(err) throw err;

  var query = new QueryStream('SELECT * FROM companies');
  var stream = client.query(query);
  stream.on('error', function(err) { console.log('error', err); });
  stream.on('close', function(){ client.end(); console.log('pg done'); } );

 
  var bulkExec = function(bulkCmds, callback) {
    elasticClient.bulk({
      index : 'companies-index',
      type  : 'companies-type',
      body  : bulkCmds
    }, callback);
  };
  var ws = new WritableBulk(bulkExec);
  var toBulk = new TransformToBulk(function getIndexTypeId(doc) { return { _id: doc.id }; });

  stream.pipe(toBulk).pipe(ws);
  ws.on('finish', function() { console.log('elastic done') });
  ws.on('error', function(e) { console.log('elastic error', JSON.stringify(e)); });

});

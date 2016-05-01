module.exports = function() {
  var io = require('sails.io.js')( require('socket.io-client') );
  io.sails.initialConnectionHeaders = {nosession: true};
  io.sails.url = 'http://edr';
  
  var stream = require('stream');
  var mongoWriter = new stream.Writable({objectMode: true, highWaterMark: 5});
  mongoWriter._write = function (chunk, encoding, done) {
    io.socket.post('/companies', chunk, function(resData, jwRes) {
      if(jwRes.statusCode != 201) {
        done(new Error(JSON.stringify(jwRes)));
      } else {
        console.log('Imported ' + chunk.id);
        done();
      }
    }.bind(this));
  };
  return mongoWriter;
}

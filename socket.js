module.exports = function() {
  var io = require('sails.io.js')( require('socket.io-client') );
  io.sails.initialConnectionHeaders = {nosession: true};
  io.sails.url = 'http://edr';
  
  var stream = require('stream');
  var mongoWriter = new stream.Writable({objectMode: true});
  mongoWriter._write = function (chunk, encoding, done) {
    io.socket.post('/companies', chunk, function(resData, jwRes) {
      if(jwRes.statusCode != 200) {
      }
      done();
    });
  };
  return mongoWriter;
}

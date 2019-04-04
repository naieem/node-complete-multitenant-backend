var mongoose = require('mongoose');
var config = require('./globalConfig');
mongoose.connect(config.localdb);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log('database connected');
});
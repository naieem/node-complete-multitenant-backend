var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
const fileUpload = require('express-fileupload');
var logger = require('morgan');
var cors = require('cors');
var mongoose = require('mongoose');
var db = require('./db');
global.tagValidator = {};
global.baseUrl = __dirname + '/';
global.uploadedFileId = '';
var apiRouter = require('./routes/api');
var site = require('./tables/core/site.table');
var tables = require('./tables/tables');
var app = express();
app.use(cors());
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// app.use(fileUpload());

app.use((req, res, next) => {
    if (!sites.includes(req.headers.origin)) {
        res.json(200, {
            status: false,
            message: 'Site not registered'
        });
    } else {
        global.origin = req.headers.origin;
        next();
    }
});

app.use('/api', apiRouter);

// catch 404 and forward to error handler
// app.use(function (req, res, next) {
//   next(createError(404));
// });

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});
getAllSiteConfiguration();
module.exports = app;


function getAllTagValidator(model, origin) {
    var tags = {};
    model.find({}, (err, doc) => {
        doc.forEach((tag) => {
            tags[tag.tag] = {
                table: tag.tableName,
                shouldvalidate: tag.shouldValidate
            }
        });
        global.tagValidator[origin] = tags;
    });
}

function getAllSiteConfiguration() {
    var table = {};
    var sites = [];
    site.find({}, (err, result) => {
        result.forEach((element) => {
            sites.push(element.sitename);
            var connection = mongoose.createConnection(element.tenantstring);
            var tableinfo = {};
            tables.forEach((table) => {
                tableinfo[table.name] = connection.model(table.name, table.schema);
            });
            table[element.sitename] = tableinfo;
            getAllTagValidator(tableinfo['tagvalidator'], element.sitename);
        });
        global.tables = table;
        global.sites = sites;
    });
}
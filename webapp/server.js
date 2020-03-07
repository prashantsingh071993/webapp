const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const db = require('./db');

const userService = require('./services/user');
const billService = require('./services/bill');
const fileService = require('./services/file');
const fileUpload = require('express-fileupload');
db.init();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin",
        "*");
    res.header("Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    next();
});
app.use(fileUpload());


userService(app);
billService(app);
fileService(app);

var server = app.listen(process.env.PORT || 3000, function () {
    var port = server.address().port;
    console.log("Running on port: ", port);
});

module.exports = app;

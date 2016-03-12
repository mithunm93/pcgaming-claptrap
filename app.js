var express = require('express');
var bodyParser = require('body-parser');
var schedule = require('node-schedule');
var Sales = require('./sales.js');
var commands = require('./commands.js');

var app = express();
var port = process.env.PORT || 3000;

// body parser middleware
app.use(bodyParser.urlencoded({ extended: true }));

console.log('Starting salebot scheduler');
// 10 AM PST every day, heroku server is on GMT
var j = schedule.scheduleJob({hour: 17, minute: 5}, new Sales().dailyCheck);

app.post('/commands', commands);

// error handler
app.use(function (err, req, res, next) {
   console.error(err.stack);
   res.status(400).send(err.message);
});

app.listen(port, function () {
   console.log('Slack bot listening on port ' + port);
});

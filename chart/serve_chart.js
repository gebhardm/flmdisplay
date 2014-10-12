#!/usr/bin/env node
/***********************************************************
This .js file serves a chart display from FLM sensor data
stored in a mysql database.
(c) Markus Gebhard, Karlsruhe, 2014 - under MIT license
delivered "as is", no guarantee to work ;-)

uses
  mysql module: https://github.com/felixge/node-mysql
  socket.io module: http://github.com/Automattic/socket.io
************************************************************/
var mysql = require('mysql');
// set the listening port to your convenience
var httpport = 8080; 
// install the http handler and listener
var http = require('http').createServer(handler).listen(httpport);
// provide required access functionality
var fs = require('fs');
var url = require('url');
var path = require('path');
var qs = require('querystring');
// use the socket.io module listening on the http port
var io = require('socket.io')(http);

// prepare the database access - use your db's values
var dbaccess = {
      host : 'localhost',
      user : 'pi',
      password : 'raspberry',
      database : 'flm'
    };

// Serve the http request
function handler (req, res) {
   var uri = url.parse(req.url).pathname;
   var filename = path.join(process.cwd(), uri);

   var contentTypesByExtension = {
      '.html': "text/html",
      '.css': "text/css",
      '.js': "text/javascript"
   };

// serve requested files
   fs.exists(filename, function(exists) {
      if(!exists) {
        res.writeHead(404, {"Content-Type": "text/plain"});
        res.write("404 Not Found\n");
        res.end();
        return;
      }

      if (fs.statSync(filename).isDirectory()) filename += '/chart.html';

      fs.readFile(filename, "binary", function(err, file) {
        if(err) {
          res.writeHead(500, {"Content-Type": "text/plain"});
          res.write(err + "\n");
          res.end();
          return;
        }

        var headers = {};
        var contentType = contentTypesByExtension[path.extname(filename)];
        if (contentType) headers["Content-Type"] = contentType;
        res.writeHead(200, headers);
        res.write(file, "binary");
        res.end();
      });
   });
};

// set the websocket io handler
io.on('connection', function(socket) {
  socket.on('query', function (data) { handlequery(data); });
});

// define what shall be done on a io request
function handlequery(data) {
// send message that data load it started...
  io.sockets.emit('info','<center>Loading...</center>'); 
// get time interval to query
  var fromTimestamp = data.fromTimestamp;
  var toTimestamp = data.toTimestamp;
// check delivered interval
  if (toTimestamp<fromTimestamp) {
    var temp = fromTimestamp;
    fromTimestamp = toTimestamp;
    toTimestamp = temp;
  }
  var timeLen = toTimestamp - fromTimestamp;
// check if interval is small enough to query
  if (timeLen > (12*60*60)) {
    io.sockets.emit('info','<center><strong>Time interval too large to query...</strong></center>');
    return;
  }
// prepare database connection
  var database = mysql.createConnection(dbaccess);
  database.connect(function(err) {
    if (err) throw err;
  });
// fetch flm data from database
  var queryStr = 'SELECT * FROM flmdata WHERE timestamp >= \''
                  + fromTimestamp + '\' AND timestamp <= \''
                  + toTimestamp + '\';';
  var query = database.query(queryStr, function(err, rows, fields) {
    if (err) throw err;
    var series = {};
    for (var i in rows) {
      if (series[rows[i].sensor] == null) series[rows[i].sensor] = new Array();
      series[rows[i].sensor].push([rows[i].timestamp*1000,rows[i].value]);                    
    };
// reduce the timeseries length through averages
    if (timeLen > (2*60*60)) { 
      for (var s in series) {
        var n = 0, avg = 0;
        var ser = new Array();
        for (var v in series[s]) {
          // series[s][v] delivers the single series [timestamp,value]
          n++;
          avg += parseInt(series[s][v][1]);
          tim = new Date(series[s][v][0]);
          if (tim.getSeconds()==0) {
            avg = Math.round(avg / n);
            ser.push([series[s][v][0],avg]);
            avg = 0;
            n = 0;
          };
        };
        series[s] = ser;
      };
    };
// send data to requester
    io.sockets.emit('series', series);
// ...and close the database again
    database.end();
  });
}

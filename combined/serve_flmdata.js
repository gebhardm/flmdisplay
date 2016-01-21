/*
 * This is the combined script to serve a panel, chart and persistence service
 * for Fluksometer data processing.
 * (c) Markus Gebhard, Karlsruhe, 2014/2015
 *
 * In parts copyright (c) 2013, Fabian Affolter <fabian@affolter-engineering.ch>
 * Released under the MIT license. See LICENSE file for details.
 *
 * zeroconfig FLM discovery uses https://github.com/agnat/node_mdns
 * be aware of Apple compatibility layer
 * Static http server part taken from Ryan Florence (rpflorence on github)
 * https://gist.github.com/rpflorence/701407
 *
 * Note: use 'npm install' with package.json to get all dependencies
 */
// use http for page serving, fs for getting the *.html files
var httpport = 1080;

var http = require("http").createServer(httphandler).listen(httpport);

var fs = require("fs");

var url = require("url");

var path = require("path");

// store detected sensors
var sensors = {};

// database access
var mysql = require("mysql");

// prepare the database access - use your db's values
var dbaccess = {
    host: "localhost",
    user: "pi",
    password: "raspberry",
    database: "flm"
};

var database = mysql.createConnection(dbaccess);

prepare_database();

// use mqtt for client, socket.io for push,
var mqtt = require("mqtt");

var mqttclient;

// multicast DNS service discovery
var mdns = require("mdns");

// the socket listens on the http port
var io = require("socket.io")(http);

// handle socketio requests
io.on("connection", function(socket) {
    // handle database query request
    socket.on("query", function(data) {
        console.log("Socket received query request...");
        handlequery(data);
    });
    // handle additional subscription request(s)
    socket.on("subscribe", function(data) {
        mqttclient.subscribe(data.topic);
    });
    // define what shall be done on a io request
    function handlequery(data) {
        // send message that data load it started...
        io.sockets.emit("info", "<center>Loading...</center>");
        // get time interval to query
        var fromTimestamp = data.fromTimestamp;
        var toTimestamp = data.toTimestamp;
        // log the query request
        console.log("Handling query from " + fromTimestamp + " to " + toTimestamp);
        // check delivered interval
        if (toTimestamp < fromTimestamp) {
            var temp = fromTimestamp;
            fromTimestamp = toTimestamp;
            toTimestamp = temp;
        }
        var timeLen = toTimestamp - fromTimestamp;
        // check if interval is small enough to query
        if (timeLen > 12 * 60 * 60) {
            io.sockets.emit("info", "<center><strong>Time interval too large to query...</strong></center>");
            return;
        }
        // fetch flm data from database
        var queryStr = "SELECT * FROM flmdata WHERE timestamp >= '" + fromTimestamp + "' AND timestamp <= '" + toTimestamp + "';";
        var query = database.query(queryStr, function(err, rows, fields) {
            if (err) throw err;
            var series = {};
            for (var i in rows) {
                var sensorId = rows[i].sensor;
                if (sensors[sensorId] != null) sensorId = sensors[sensorId].name;
                if (series[sensorId] == null) series[sensorId] = new Array();
                series[sensorId].push([ rows[i].timestamp * 1e3, rows[i].value ]);
            }
            // reduce the time series length through averages
            if (timeLen > 2 * 60 * 60) {
                for (var s in series) {
                    var n = 0, avg = 0;
                    var ser = new Array();
                    for (var v in series[s]) {
                        // series[s][v] delivers the single series [timestamp,value]
                        n++;
                        avg += parseInt(series[s][v][1]);
                        tim = new Date(series[s][v][0]);
                        if (tim.getSeconds() == 0) {
                            avg = Math.round(avg / n);
                            ser.push([ series[s][v][0], avg ]);
                            avg = 0;
                            n = 0;
                        }
                    }
                    series[s] = ser;
                }
            }
            // send data to requester
            io.sockets.emit("series", series);
            console.log("Queried series transmitted...");
        });
    }
});

// detect mqtt publishers and create corresponding servers
var mdnsbrowser = mdns.createBrowser(mdns.tcp("mqtt"));

// mdnsbrowser.on
mdnsbrowser.start();

// handle detected devices
mdnsbrowser.on("serviceUp", function(service) {
    console.log("Detected MQTT service on: " + service.addresses[0] + ":" + service.port);
    mqttclient = mqtt.connect({
        port: service.port,
        host: service.addresses[0]
    });
    mqttclient.on("connect", function() {
        var now = new Date();
        console.log(now + " : Connected to " + service.addresses[0] + ":" + service.port);
        // for the persistence subscription is needed:        
        mqttclient.subscribe("/device/+/config/sensor");
        mqttclient.subscribe("/sensor/+/gauge");
        mqttclient.subscribe("/sensor/+/counter");
    });
    mqttclient.on("error", function() {
        // error handling to be a bit more sophisticated...
        console.log("An MQTT error occurred...");
    });
    // handle mqtt messages
    mqttclient.on("message", function(topic, message) {
        var topicArray = topic.split("/");
        var payload = message.toString();
        // don't handle messages with weird tokens, e.g. compression
        try {
            payload = JSON.parse(payload);
        } catch (error) {
            return;
        }
        switch (topicArray[1]) {
          case "device":
            handle_device(topicArray, payload);
            break;

          case "sensor":
            handle_sensor(topicArray, payload);
            break;

          default:
            break;
        }
        // emit received message to socketio listener
        io.sockets.emit("mqtt", {
            topic: topic,
            payload: JSON.stringify(payload)
        });
    });
    // handle the device configuration
    function handle_device(topicArray, payload) {
        switch (topicArray[3]) {
          case "config":
            for (var obj in payload) {
                var cfg = payload[obj];
                if (cfg.enable == "1") {
                    if (sensors[cfg.id] == null) {
                        sensors[cfg.id] = new Object({
                            id: cfg.id,
                            name: cfg.function
                        });
                        var insertStr = "INSERT INTO flmconfig" + " (sensor, name)" + ' VALUES ("' + cfg.id + '",' + ' "' + cfg.function + '")' + " ON DUPLICATE KEY UPDATE" + " sensor = VALUES(sensor)," + " name = VALUES(name);";
                        database.query(insertStr, function(err, res) {
                            if (err) {
                                database.end();
                                throw err;
                            }
                        });
                        console.log("Detected sensor " + cfg.id + " (" + cfg.function + ")");
                    }
                }
            }
            break;

          default:
            break;
        }
    }
    // handle the sensor readings
    function handle_sensor(topicArray, payload) {
        switch (topicArray[3]) {
          case "gauge":
            switch (payload.length) {
              case 2:
                var now = parseInt(new Date().getTime() / 1e3);
                payload.unshift(now);
                break;

              case 3:
                // FLM gauges consist of timestamp, value, and unit
                var insertStr = "INSERT INTO flmdata" + " (sensor, timestamp, value, unit)" + ' VALUES ("' + topicArray[2] + '",' + ' "' + payload[0] + '",' + ' "' + payload[1] + '",' + ' "' + payload[2] + '")' + " ON DUPLICATE KEY UPDATE" + " sensor = VALUES(sensor)," + " timestamp = VALUES(timestamp)," + " value = VALUES(value)," + " unit = VALUES(unit);";
                database.query(insertStr, function(err, res) {
                    if (err) {
                        database.end();
                        throw err;
                    }
                });
                break;

              default:
                break;
            }
            break;

          default:
            break;
        }
    }
});

// handle if mdns service goes offline
mdnsbrowser.on("serviceDown", function(service) {
    console.log("MDNS service went down: ", service);
});

// handle if mdns throws an error
mdnsbrowser.on("error", function(exception) {
    console.log("MDNS service threw an error: ", exception);
});

// advertise the http server on the httpport
var ad = new mdns.Advertisement(mdns.tcp("http"), httpport, {
    name: "FLM visualization and persistence"
});

ad.start();

// connect to database and check/create required tables
function prepare_database() {
    // connect to database
    database.connect(function(err) {
        if (err) throw err;
        console.log("Database flm successfully connected");
    });
    // define the config persistence if it does not exist
    var createTabStr = "CREATE TABLE IF NOT EXISTS flmconfig" + "( sensor CHAR(32)," + "  name CHAR(32)," + "  UNIQUE KEY (sensor)" + ");";
    // and send the create command to the database
    database.query(createTabStr, function(err, res) {
        if (err) {
            database.end();
            throw err;
        }
        console.log("Create/connect to config table successful...");
    });
    // define the data persistence if it does not exist
    createTabStr = "CREATE TABLE IF NOT EXISTS flmdata" + "( sensor CHAR(32)," + "  timestamp CHAR(10)," + "  value CHAR(5)," + "  unit CHAR(5)," + "  UNIQUE KEY (sensor, timestamp)," + "  INDEX idx_time (timestamp)" + ");";
    // and send the create command to the database
    database.query(createTabStr, function(err, res) {
        if (err) {
            database.end();
            throw err;
        }
        console.log("Create/connect to data table successful...");
    });
}

// Serve the index.html page
function httphandler(req, res) {
    var uri = url.parse(req.url).pathname, filename = path.join(process.cwd(), uri);
    var contentTypesByExtension = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript"
    };
    // serve requested files
    fs.exists(filename, function(exists) {
        if (!exists) {
            res.writeHead(404, {
                "Content-Type": "text/plain"
            });
            res.write("404 Not Found\n");
            res.end();
            return;
        }
        if (fs.statSync(filename).isDirectory()) filename += "/panel.html";
        fs.readFile(filename, "binary", function(err, file) {
            if (err) {
                res.writeHead(500, {
                    "Content-Type": "text/plain"
                });
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
}

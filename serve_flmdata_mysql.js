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

// multicast DNS service discovery
var mdns = require("mdns");

// resolution requence added due to mdns issue - see https://github.com/agnat/node_mdns/issues/130
var sequence = [ mdns.rst.DNSServiceResolve(), "DNSServiceGetAddrInfo" in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({
    families: [ 4 ]
}), mdns.rst.makeAddressesUnique() ];

// detect mqtt publishers and create corresponding servers
var mdnsbrowser = mdns.createBrowser(mdns.tcp("mqtt"), {
    resolverSequence: sequence
});

// handle detected devices
mdnsbrowser.on("serviceUp", function(service) {
    console.log("Detected MQTT service on: " + service.addresses[0] + ":" + service.port);
    mqttconnect(service.addresses[0], service.port);
});

// handle if mdns service goes offline
mdnsbrowser.on("serviceDown", function(service) {
    console.log("MDNS service went down: ", service);
});

// handle if mdns throws an error
mdnsbrowser.on("error", function(exception) {
    console.log("MDNS service threw an error: ", exception);
});

// start the mdns browser
mdnsbrowser.start();

// advertise the http server on the httpport
var ad = new mdns.Advertisement(mdns.tcp("http"), httpport, {
    name: "FLM visualization and persistence"
});

ad.start();

// the socket listens on the http port
var io = require("socket.io")(http);

// handle the detected mqtt service
function mqttconnect(address, port) {
    var mqttclient, flx;
    mqttclient = mqtt.connect({
        port: port,
        host: address
    });
    // handle socketio requests
    io.on("connection", function(socket) {
        // handle additional subscription request(s)
        socket.on("subscribe", function(data) {
            // console.log("Socket received subscribe:", data.topic);
            mqttclient.subscribe(data.topic);
        });
    });
    // check mqtt messages
    mqttclient.on("connect", function() {
        var now = new Date();
        console.log(now + " : Connected to " + address + ":" + port);
        // for the persistence subscription is needed:        
        mqttclient.subscribe("/device/+/config/sensor");
        mqttclient.subscribe("/device/+/config/flx");
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
            handle_device(flx, topicArray, payload);
            break;

          case "sensor":
            handle_sensor(flx, topicArray, payload);
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
}

// handle the device configuration
function handle_device(flx, topicArray, payload) {
    switch (topicArray[4]) {
      case "flx":
        flx = payload;
        break;

      case "sensor":
        for (var obj in payload) {
            var cfg = payload[obj];
            if (cfg.enable == "1") {
                if (sensors[cfg.id] == null) {
                    sensors[cfg.id] = new Object();
                    sensors[cfg.id].id = cfg.id;
                    if (cfg.function != undefined) {
                        sensors[cfg.id].name = cfg.function;
                    } else {
                        sensors[cfg.id].name = cfg.id;
                    }
                    if (cfg.subtype != undefined) sensors[cfg.id].subtype = cfg.subtype;
                    if (cfg.port != undefined) sensors[cfg.id].port = cfg.port[0];
                } else {
                    if (cfg.function != undefined) sensors[cfg.id].name = cfg.function;
                }
                console.log("Detected sensor " + sensors[cfg.id].id + " (" + sensors[cfg.id].name + ")");
            }
        }
        break;

      default:
        break;
    }
}

// handle the sensor readings
function handle_sensor(flx, topicArray, payload) {
    // the retrieved sensor information
    var sensor = {};
    var id, timestamp, value, unit;
    // the message type is the third value
    var msgType = topicArray[3];
    // the sensor ID
    var sensorId = topicArray[2];
    if (sensors[sensorId] == null) {
        sensors[sensorId] = new Object();
        sensor.id = sensorId;
        sensor.name = sensorId;
    } else sensor = sensors[sensorId];
    // reset the name, if possible
    if (sensor.name == sensorId && flx != undefined && sensor.port != undefined) {
        sensor.name = flx[sensor.port].name + " " + sensor.subtype;
    }
    sensors[sensorId] = sensor;
    switch (msgType) {
      case "gauge":
        switch (payload.length) {
          case 2:
            var now = parseInt(new Date().getTime() / 1e3);
            payload.unshift(now);
            break;

          case 3:
            id = topicArray[2];
            timestamp = payload[0];
            value = Math.round(payload[1]);
            unit = payload[2];
            // FLM gauges consist of timestamp, value, and unit
            if (unit === "W") {
                var insertStr = "INSERT INTO flmdata" + " (sensor, timestamp, value, unit)" + ' VALUES ("' + id + '",' + ' "' + timestamp + '",' + ' "' + value + '",' + ' "' + unit + '")' + " ON DUPLICATE KEY UPDATE" + " sensor = VALUES(sensor)," + " timestamp = VALUES(timestamp)," + " value = VALUES(value)," + " unit = VALUES(unit);";
                database.query(insertStr, function(err, res) {
                    if (err) {
                        database.end();
                        throw err;
                    }
                });
            }
            break;

          default:
            break;
        }
        break;

      default:
        break;
    }
}

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

io.on("connection", function(socket) {
    // handle database query request
    socket.on("query", function(data) {
        console.log("Socket received query request...");
        handlequery(data);
    });
});
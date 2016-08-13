var httpport = 1080;

var http = require("http").createServer(httphandler).listen(httpport);

var fs = require("fs");

var url = require("url");

var path = require("path");

var sensors = {};

var mysql = require("mysql");

var dbaccess = {
    host: "localhost",
    user: "pi",
    password: "raspberry",
    database: "flm"
};

var database = mysql.createConnection(dbaccess);

prepare_database();

var mqtt = require("mqtt");

var mdns = require("mdns");

var sequence = [ mdns.rst.DNSServiceResolve(), "DNSServiceGetAddrInfo" in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({
    families: [ 4 ]
}), mdns.rst.makeAddressesUnique() ];

var mdnsbrowser = mdns.createBrowser(mdns.tcp("mqtt"), {
    resolverSequence: sequence
});

mdnsbrowser.on("serviceUp", function(service) {
    console.log("Detected MQTT service on: " + service.addresses[0] + ":" + service.port);
    mqttconnect(service.addresses[0], service.port);
});

mdnsbrowser.on("serviceDown", function(service) {
    console.log("MDNS service went down: ", service);
});

mdnsbrowser.on("error", function(exception) {
    console.log("MDNS service threw an error: ", exception);
});

mdnsbrowser.start();

var ad = new mdns.Advertisement(mdns.tcp("http"), httpport, {
    name: "FLM visualization and persistence"
});

ad.start();

var io = require("socket.io")(http);

io.on("connection", function(socket) {
    socket.on("query", function(data) {
        console.log("Socket received query request...");
        handlequery(data);
    });
});

function mqttconnect(address, port) {
    var mqttclient;
    var name;
    var flx;
    mqttclient = mqtt.connect({
        port: port,
        host: address
    });
    mqttclient.on("connect", function() {
        var now = new Date();
        console.log(now + " : Connected to " + address + ":" + port);
        mqttclient.subscribe("/device/+/config/flx");
        mqttclient.subscribe("/device/+/config/sensor");
    });
    mqttclient.on("error", function() {
        console.log("An MQTT error occurred...");
    });
    mqttclient.on("message", function(topic, message) {
        var topicArray = topic.split("/");
        var payload = message.toString();
        try {
            payload = JSON.parse(payload);
        } catch (error) {
            return;
        }
        switch (topicArray[1]) {
          case "device":
            handle_device(topicArray, payload);
            name = topicArray[2];
            break;

          case "sensor":
            handle_sensor(topicArray, payload);
            if (sensors[topicArray[2]] !== undefined) {
                name = sensors[topicArray[2]].name;
            } else {
                name = topicArray[2];
            }
            break;

          default:
            break;
        }
        io.sockets.emit("mqtt", {
            name: name,
            topic: topic,
            payload: JSON.stringify(payload)
        });
    });
    function handle_device(topicArray, payload) {
        switch (topicArray[4]) {
          case "flx":
            flx = payload;
            for (var id in sensors) {
                if (sensors[id].port !== undefined) sensors[id].name = flx[sensors[id].port].name + " " + sensors[id].subtype;
                var insertStr = 'INSERT INTO flmconfig (sensor, name) VALUES ("' + sensors[id].id + '", "' + sensors[id].name + '") ON DUPLICATE KEY UPDATE name = "' + sensors[id].name + '";';
                database.query(insertStr, function(err, res) {
                    if (err) {
                        database.end();
                        throw err;
                    }
                });
            }
            break;

          case "sensor":
            for (var obj in payload) {
                var cfg = payload[obj];
                if (cfg.enable == "1") {
                    if (sensors[cfg.id] === undefined) sensors[cfg.id] = new Object();
                    sensors[cfg.id].id = cfg.id;
                    if (cfg.function !== undefined) {
                        sensors[cfg.id].name = cfg.function;
                    } else if (flx !== undefined && flx[cfg.port] !== undefined) {
                        sensors[cfg.id].name = flx[cfg.port].name + " " + cfg.subtype;
                    }
                    if (cfg.subtype !== undefined) sensors[cfg.id].subtype = cfg.subtype;
                    if (cfg.port !== undefined) sensors[cfg.id].port = cfg.port[0];
                    var insertStr = 'INSERT INTO flmconfig (sensor, name) VALUES ("' + cfg.id + '", "' + sensors[cfg.id].name + '") ON DUPLICATE KEY UPDATE name = "' + sensors[cfg.id].name + '";';
                    database.query(insertStr, function(err, res) {
                        if (err) {
                            database.end();
                            throw err;
                        }
                    });
                    console.log("Detected sensor " + sensors[cfg.id].id + " (" + sensors[cfg.id].name + ")");
                    mqttclient.subscribe("/sensor/" + cfg.id + "/gauge");
                    mqttclient.subscribe("/sensor/" + cfg.id + "/counter");
                }
            }
            break;

          default:
            break;
        }
    }
}

function handle_sensor(topicArray, payload) {
    var sensor = {};
    var id, timestamp, value, unit;
    var msgType = topicArray[3];
    var sensorId = topicArray[2];
    if (sensors[sensorId] === undefined) {
        sensors[sensorId] = new Object();
        sensor.id = sensorId;
        sensor.name = sensorId;
    } else sensor = sensors[sensorId];
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

function prepare_database() {
    database.connect(function(err) {
        if (err) throw err;
        console.log("Database flm successfully connected");
    });
    var createTabStr = "CREATE TABLE IF NOT EXISTS flmconfig" + "( sensor CHAR(32)," + "  name CHAR(32)," + "  UNIQUE KEY (sensor)" + ");";
    database.query(createTabStr, function(err, res) {
        if (err) {
            database.end();
            throw err;
        }
        console.log("Create/connect to config table successful...");
    });
    createTabStr = "CREATE TABLE IF NOT EXISTS flmdata" + "( sensor CHAR(32)," + "  timestamp CHAR(10)," + "  value CHAR(5)," + "  unit CHAR(5)," + "  UNIQUE KEY (sensor, timestamp)," + "  INDEX idx_time (timestamp)" + ");";
    database.query(createTabStr, function(err, res) {
        if (err) {
            database.end();
            throw err;
        }
        console.log("Create/connect to data table successful...");
    });
}

function httphandler(req, res) {
    var uri = url.parse(req.url).pathname, filename = path.join(process.cwd(), uri);
    var contentTypesByExtension = {
        ".html": "text/html",
        ".css": "text/css",
        ".js": "text/javascript"
    };
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

function handlequery(data) {
    io.sockets.emit("info", "<center>Loading...</center>");
    var fromTimestamp = data.fromTimestamp;
    var toTimestamp = data.toTimestamp;
    console.log("Handling query from " + fromTimestamp + " to " + toTimestamp);
    if (toTimestamp < fromTimestamp) {
        var temp = fromTimestamp;
        fromTimestamp = toTimestamp;
        toTimestamp = temp;
    }
    var timeLen = toTimestamp - fromTimestamp;
    if (timeLen > 12 * 60 * 60) {
        io.sockets.emit("info", "<center><strong>Time interval too large to query...</strong></center>");
        return;
    }
    var queryStr = "SELECT * FROM flmdata WHERE timestamp >= '" + fromTimestamp + "' AND timestamp <= '" + toTimestamp + "';";
    var query = database.query(queryStr, function(err, rows, fields) {
        if (err) throw err;
        var series = {};
        for (var i in rows) {
            var sensorId = rows[i].sensor;
            if (sensors[sensorId] !== undefined) sensorId = sensors[sensorId].name;
            if (series[sensorId] === undefined) series[sensorId] = new Array();
            series[sensorId].push([ rows[i].timestamp * 1e3, rows[i].value ]);
        }
        if (timeLen > 2 * 60 * 60) {
            for (var s in series) {
                var n = 0, avg = 0;
                var ser = new Array();
                for (var v in series[s]) {
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
        io.sockets.emit("series", series);
        console.log("Queried series transmitted...");
    });
}
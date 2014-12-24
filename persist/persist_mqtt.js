/***********************************************************
This .js file subscribes to FLM sensor topics
and stores the received sensor gauges into a
mysql database.
(c) Markus Gebhard, Karlsruhe, 2014 - under MIT license
delivered "as is", no guarantee to work ;-)

uses
  mysql module: https://github.com/felixge/node-mysql
  mqtt module: https://github.com/adamvr/MQTT.js/
  mdns module: https://github.com/agnat/node_mdns
************************************************************/
var mysql = require("mysql");

// database connect and query
var mqtt = require("mqtt");

// mqtt message client
var mdns = require("mdns");

// multicast DNS service discovery
var mdnsbrowser = mdns.createBrowser(mdns.tcp("mqtt"));

mdnsbrowser.on("serviceUp", function(service) {
    console.log("detected:" + service.addresses[0] + ":" + service.port);
    // connect to discovered mqtt broker
    var mqttclient = mqtt.createClient(service.port, service.addresses[0]);
    // subscribe to sensor topics
    mqttclient.subscribe("/sensor/#");
    // act on received message
    mqttclient.on("message", function(topic, payload) {
        var subtopics = topic.split("/");
        switch (subtopics[3]) {
          case "gauge":
            var gauge = JSON.parse(payload);
            // FLM gauges consist of timestamp, value, and unit
            if (gauge.length == 3) {
                // use the following conversion when using mySQL TIMESTAMP and replace gauge[0]
                //var date = new Date(gauge[0]*1000).toISOString().slice(0, 19).replace('T', ' ');
                var insertStr = "INSERT INTO flmdata" + " (sensor, timestamp, value, unit)" + ' VALUES ("' + subtopics[2] + '",' + ' "' + gauge[0] + '",' + ' "' + gauge[1] + '",' + ' "' + gauge[2] + '")' + " ON DUPLICATE KEY UPDATE" + " sensor = VALUES(sensor)," + " timestamp = VALUES(timestamp)," + " value = VALUES(value)," + " unit = VALUES(unit);";
                database.query(insertStr, function(err, res) {
                    if (err) {
                        database.end();
                        throw err;
                    }
                });
            }
            // gauge length 3 - you may define further gauge lengths to be persisted
            break;

          case "counter":
            break;
        }
    });
});

// mdnsbrowser.on
// and start to discover
mdnsbrowser.start();

// define database and connect
var database = mysql.createConnection({
    host: "localhost",
    user: "pi",
    password: "raspberry",
    database: "flm"
});

database.connect(function(err) {
    if (err) throw err;
    console.log("Database flm successfully connected");
});

// create the persistence if it does not exist
var createTabStr = "CREATE TABLE IF NOT EXISTS flmdata" + "( sensor CHAR(32)," + "  timestamp CHAR(10)," + "  value CHAR(5)," + "  unit CHAR(5)," + "  UNIQUE KEY (sensor, timestamp)," + "  INDEX idx_time (timestamp)" + ");";

database.query(createTabStr, function(err, res) {
    if (err) {
        database.end();
        throw err;
    }
    console.log("Create table successful...");
});
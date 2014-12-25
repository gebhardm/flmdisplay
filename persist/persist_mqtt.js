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

// the database to use
var database;

// detect the MQTT broker using Bonjour
mdnsbrowser.on("serviceUp", function(service) {
    console.log("detected:" + service.addresses[0] + ":" + service.port);
    // connect to discovered mqtt broker
    var mqttclient = mqtt.createClient(service.port, service.addresses[0]);
    // subscribe to fluksometer topics
    mqttclient.subscribe("/device/#");
    mqttclient.subscribe("/sensor/#");
    // act on received message
    mqttclient.on("message", function(topic, payload) {
        var topicArray = topic.split("/");
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
    });
    // handle the device configuration
    function handle_device(topicArray, payload) {
        switch (topicArray[3]) {
          case "config":
            var config = JSON.parse(payload);
            for (var obj in config) {
                var cfg = config[obj];
                if (cfg.enable == "1") {
                var insertStr = "INSERT INTO flmconfig" + 
                                " (sensor, name)" + 
                                ' VALUES ("' + cfg.id + '",' + 
                                ' "' + cfg.function + '")' + 
                                " ON DUPLICATE KEY UPDATE" + 
                                " sensor = VALUES(cfg.id)," + 
                                " name = VALUES(cfg.function);";
                database.query(insertStr, function(err, res) {
                    if (err) {
                        database.end();
                        throw err;
                    }
                    console.log("Detected sensor " + cfg.id + " (" + cfg.function + ")");
                });

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
            var gauge = JSON.parse(payload);
            // FLM gauges consist of timestamp, value, and unit
            if (gauge.length == 3) {
                var insertStr = "INSERT INTO flmdata" + 
                                " (sensor, timestamp, value, unit)" + 
                                ' VALUES ("' + subtopics[2] + '",' + 
                                ' "' + gauge[0] + '",' + 
                                ' "' + gauge[1] + '",' + 
                                ' "' + gauge[2] + '")' + 
                                " ON DUPLICATE KEY UPDATE" + 
                                " sensor = VALUES(sensor)," + 
                                " timestamp = VALUES(timestamp)," + 
                                " value = VALUES(value)," + 
                                " unit = VALUES(unit);";
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
    }
});

function prepare_database() {
    // connect to database
    database = mysql.createConnection({
        host: "localhost",
        user: "pi",
        password: "raspberry",
        database: "flm"
    });
    database.connect(function(err) {
        if (err) throw err;
        console.log("Database 'flm' successfully connected");
    });
    // create the config persistence if it does not exist
    var createTabStr = "CREATE TABLE IF NOT EXISTS flmconfig" + 
                       "( sensor CHAR(32)," +
                       "  name CHAR(32)," +
                       "  UNIQUE KEY sensor" + 
                       ");";
    database.query(createTabStr, function(err, res) {
        if (err) {
            database.end();
            throw err;
        }
        console.log("Table 'flmconfig' created successfully...");
    });
    // create the data persistence if it does not exist
    var createTabStr = "CREATE TABLE IF NOT EXISTS flmdata" + 
                       "( sensor CHAR(32)," + 
                       "  timestamp CHAR(10)," + 
                       "  value CHAR(5)," + 
                       "  unit CHAR(5)," + 
                       "  UNIQUE KEY (sensor, timestamp)," + 
                       "  INDEX idx_time (timestamp)" + ");";
    database.query(createTabStr, function(err, res) {
        if (err) {
            database.end();
            throw err;
        }
        console.log("Table 'flmdata' created successfully...");
    });
}

// check and, if necessary, create the database table
prepare_database();

// mdnsbrowser.on and start to discover
mdnsbrowser.start();

var mqtt = require("mqtt");
var mdns = require("mdns");
var zlib = require("zlib");
var mdnsbrowser = mdns.createBrowser(mdns.tcp("mqtt"));

mdnsbrowser.start();
mdnsbrowser.on("serviceUp", function(service) { mdnsservice(service); });

function mdnsservice(service) {
    console.log("Detected MQTT service on: " + service.addresses[0] + ":" + service.port);
    var mqttclient = mqtt.createClient(service.port, service.addresses[0]);
    mqttclient.subscribe("/sensor/+/tmpo/#");
    mqttclient.on("message", function(topic, payload) { mqtthandler(topic, payload); });

    function mqtthandler(topic, payload) {
        console.log(topic);
        zlib.gunzip(payload, function(err, ts) {
          var jsonString = ts.toString('utf-8');
          var json = JSON.parse(jsonString);
          console.log(json)
        });
    };
};

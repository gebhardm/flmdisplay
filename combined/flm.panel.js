// objects containing the actual sensor data as string and value
var sensors = {}, numGauges = 0;

// link to the web server's IP address for socket connection
var socket = io.connect(location.host);

socket.on("connect", function() {
    socket.on("mqtt", function(msg) {
        // determine topic and payload
        var topic = msg.topic.split("/");
        var payload = msg.payload;
        switch (topic[1]) {
          case "device":
            handle_device(topic, payload);
            break;

          case "sensor":
            handle_sensor(topic, payload);
            // pass the message topic and content to the html part
            $("#message").html(msg.topic + ", " + msg.payload);
            break;

          default:
            break;
        }
    });
    // handle the device information
    function handle_device(topic, payload) {
        var deviceID = topic[2];
        if (topic[3] == "config") {
            var config = JSON.parse(payload);
            for (var obj in config) {
                var cfg = config[obj];
                if (cfg.enable == "1") {
                    var sensorId = cfg.id;
                    if (sensors[sensorId] == null) {
                        sensors[sensorId] = new Object();
                        sensors[sensorId].id = cfg.id;
                        sensors[sensorId].name = cfg.function;
                    } else sensors[sensorId].name = cfg.function;
                }
            }
        }
    }
    // handle the sensor information
    function handle_sensor(topic, payload) {
        var sensor = {};
        var msgType = topic[3];
        var sensorId = topic[2];
        if (sensors[sensorId] == null) {
            sensors[sensorId] = new Object();
            sensor.id = sensorId;
            sensor.name = sensorId;
        } else sensor = sensors[sensorId];
        var value = JSON.parse(payload);
        // now compute the gauge
        switch (msgType) {
          case "gauge":
            // Sensor handling - transfer the current values from the payload
            if (value.length == null) {
                sensor.gaugevalue = value;
                sensor.gaugeunit = "";
                sensor.gaugetimestamp = "";
            } else {
                switch (value.length) {
                  case 1:
                    sensor.gaugevalue = value[0];
                    sensor.gaugeunit = "";
                    sensor.gaugetimestamp = "";
                    break;

                  case 2:
                    sensor.gaugevalue = value[0];
                    sensor.gaugeunit = value[1];
                    sensor.gaugetimestamp = "";
                    break;

                  case 3:
                    var date = new Date(value[0] * 1e3);
                    var now = new Date().getTime();
                    if (now / 1e3 - value[0] > 60) value[1] = 0;
                    sensor.gaugevalue = value[1];
                    sensor.gaugeunit = value[2];
                    sensor.gaugetimestamp = date.toLocaleString();
                    break;

                  default:
                    break;
                }
            }
            // create and fill an array of last n gauge
            // also create the corresponding table row to show - only if it not yet exists
            if (sensor.series == null) {
                sensor.series = new Array();
                numGauges++;
                var tablerow = "<tr>" + '<td width="30%" style="vertical-align:middle;">' + '<h4 id="sensor' + sensor.id + '"></h4>' + '<small id="time' + sensor.id + '"><small>' + "</td>" + '<td style="vertical-align:middle;">' + '<span id="valueSparkline' + sensor.id + '"></span>' + "</td>" + '<td width="30%" style="vertical-align:middle;">' + '<h4 id="value' + sensor.id + '"></h4>' + '<small id="counter' + sensor.id + '"></small>' + "</td>" + "</tr>";
                $("#gauge").append(tablerow);
            }
            if (sensor.series.length == 60) sensor.series.shift();
            sensor.series.push(sensor.gaugevalue);
            break;

          case "counter":
            sensor.countertimestamp = new Date(value[0] * 1e3).toLocaleString();
            sensor.countervalue = value[1] / 1e3;
            sensor.counterunit = "k" + value[2];
            break;

          default:
            break;
        }
        // now pass the data to the html part
        $("#sensor" + sensor.id).html(sensor.name);
        $("#time" + sensor.id).html(sensor.gaugetimestamp);
        $("#value" + sensor.id).html(sensor.gaugevalue + " " + sensor.gaugeunit);
        $("#valueSparkline" + sensor.id).sparkline(sensor.series, {
            type: "line",
            width: "200",
            height: "50",
            tooltipFormat: '<span class="text-info bg-info">{{x}}:{{y}}</span>'
        });
        if (sensor.countervalue !== undefined) $("#counter" + sensor.id).html("Total " + sensor.countervalue + " " + sensor.counterunit);
        sensors[sensorId] = sensor;
    }
    socket.emit("subscribe", {
        topic: "/device/+/config/sensor"
    });
    socket.emit("subscribe", {
        topic: "/sensor/#"
    });
});
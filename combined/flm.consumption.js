// link to the web server's IP address for socket connection
var socket = io.connect(location.host);

var cfgVis = true;

socket.on("connect", function() {
    // emit the subscription
    socket.emit("subscribe", {
        topic: "/device/+/config/#"
    });
    socket.emit("subscribe", {
        topic: "/sensor/+/gauge"
    });
    // objects containing the actual sensor data
    var sensors = {};
    // handle the received MQTT messages
    socket.on("mqtt", function(msg) {
        // split the received message at the slashes
        var topic = msg.topic.split("/");
        var payload = msg.payload;
        switch (topic[1]) {
          case "device":
            handle_device(topic, payload);
            break;

          case "sensor":
            handle_sensor(topic, payload);
            break;

          default:
            break;
        }
    });
    // handler for device configuration
    function handle_device(topic, payload) {
        var deviceID = topic[2];
        if (topic[3] == "config") {
            var config = JSON.parse(payload);
            for (var obj in config) {
                var cfg = config[obj];
                if (cfg.enable == "1") {
                    if (sensors[cfg.id] == null) {
                        sensors[cfg.id] = new Object();
                        sensors[cfg.id].id = cfg.id;
                        sensors[cfg.id].name = cfg.function;
                    } else sensors[cfg.id].name = cfg.function;
                }
            }
        }
    }
    // handler for sensor readings
    function handle_sensor(topic, payload) {
        var sensor = {};
        // the retrieved sensor information
        var msgType = topic[3];
        // gauge or counter
        var sensorId = topic[2];
        // the sensor ID
        var value = JSON.parse(payload);
        // the transferred payload
        // check if sensor was already retrieved
        if (sensors[sensorId] == null) {
            sensors[sensorId] = new Object();
            sensor.id = sensorId;
            sensor.name = sensorId;
        } else sensor = sensors[sensorId];
        // now compute the received mqttMessage
        switch (msgType) {
          case "gauge":
            // handle the payload to obtain gauge values
            switch (value.length) {
              case 1:
                break;

              case 2:
                if (value[1] !== "W") break;
                sensor.value = value[0];
                sensor.unit = value[1];
                break;

              case 3:
                if (value[2] !== "W") break;
                var date = new Date(value[0] * 1e3);
                // the timestamp
                var now = new Date().getTime();
                if (now / 1e3 - value[0] > 60) value[1] = 0;
                // if too old, set to 0
                sensor.time = date;
                sensor.value = value[1];
                sensor.unit = value[2];
                break;

              default:
                break;
            }
            // set up the selection and the local storage of sensor flow direction
            if (sensor.type == null && sensor.unit === "W") {
                $("#choices").append("<div class='form-inline'>" + "<label for='" + sensor.id + "' class='control-label col-sm-2'>" + sensor.name + "</label>" + "<select id='" + sensor.id + "'>" + "<option>Consumption</option>" + "<option>Production</option>" + "</select>" + "</div>");
                // on change of flow direction store the respective value
                $("#" + sensor.id).change(sensor, function(event) {
                    localStorage.setItem(event.data.id, event.data.type);
                });
                // retrieve a flow direction value that may be previously stored
                var dirVal = localStorage.getItem(sensor.id);
                if (dirVal !== null) $("#" + sensor.id).val(dirVal);
            }
            // compute the selected sensor flow direction
            var selElt = document.getElementById(sensor.id);
            if (selElt !== null) sensor.type = selElt.options[selElt.selectedIndex].value;
            sensors[sensorId] = sensor;
            break;

          default:
            break;
        }
        handle_display(sensor);
    }
    // compute the display refresh
    function handle_display(sensor) {
        var productionValue = 0;
        var consumptionValue = 0;
        for (var s in sensors) {
            switch (sensors[s].type) {
              case "Production":
                productionValue += sensors[s].value;
                break;

              case "Consumption":
                consumptionValue += sensors[s].value;
                break;

              default:
                break;
            }
        }
        var gridValue = consumptionValue - productionValue;
        var selfuseValue = productionValue > consumptionValue ? consumptionValue : productionValue;
        var supplyValue = productionValue > consumptionValue ? productionValue - consumptionValue : 0;
        var obtainedValue = consumptionValue - productionValue > 0 ? consumptionValue - productionValue : 0;
        // write the values to the display
        $("#grid").html(gridValue + "W");
        $("#supply").html(supplyValue + "W");
        $("#production").html(productionValue + "W");
        $("#selfuse").html(selfuseValue + "W");
        $("#consumption").html(consumptionValue + "W");
        $("#obtained").html(obtainedValue + "W");
        if (productionValue >= consumptionValue) {
            $("#status").css("background-color", "green");
        } else {
            $("#status").css("background-color", "red");
        }
    }
});

function display_resize() {
    // compute the scaling
    var img = $("#image");
    var width = img.width();
    var scale = width / 1226;
    var pos = img.position();
    if (pos !== undefined) {
        // format the output
        $(".watt").css("position", "absolute");
        $(".watt").css("width", 307 * scale + "px");
        $(".watt").css("text-align", "center");
        $(".watt").css("color", "rgb(91,155,213)");
        $(".watt").css("font-family", "arial");
        $(".watt").css("font-size", 64 * scale + "px");
        $(".watt").css("font-weight", "bold");
        $("#grid").css("top", pos.top + 230 * scale + "px");
        $("#grid").css("left", pos.left + 30 * scale + "px");
        $("#supply").css("top", pos.top + 10 * scale + "px");
        $("#supply").css("left", pos.left + 460 * scale + "px");
        $("#selfuse").css("top", pos.top + 420 * scale + "px");
        $("#selfuse").css("left", pos.left + 740 * scale + "px");
        $("#production").css("top", pos.top + 230 * scale + "px");
        $("#production").css("left", pos.left + 890 * scale + "px");
        $("#consumption").css("top", pos.top + 760 * scale + "px");
        $("#consumption").css("left", pos.left + 460 * scale + "px");
        $("#obtained").css("top", pos.top + 420 * scale + "px");
        $("#obtained").css("left", pos.left + 180 * scale + "px");
        $("#status").css("position", "absolute");
        $("#status").css("top", pos.top + 540 * scale + "px");
        $("#status").css("left", pos.left + 435 * scale + "px");
        $("#status").css("width", 360 * scale + "px");
        $("#status").css("height", 360 * scale + "px");
        $("#status").css("border-radius", 60 * scale + "px");
        $("#status").css("opacity", "0.2");
    }
}

$(document).ready(function() {
    // size the display
    display_resize();
    $(window).resize(function() {
        display_resize();
    });
    // toggle the configuration
    $("#toggle").click(function() {
        if (cfgVis) $("#choices").hide(); else $("#choices").show();
        cfgVis = !cfgVis;
    });
});
var socket = io.connect(location.host);

var infoVis = true;

socket.on("connect", function() {
    var flx;
    socket.emit("subscribe", {
        topic: "/device/+/config/sensor"
    });
    socket.emit("subscribe", {
        topic: "/device/+/config/flx"
    });
    socket.emit("subscribe", {
        topic: "/sensor/+/gauge"
    });
    var sensors = {};
    socket.on("mqtt", function(msg) {
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
    function handle_device(topic, payload) {
        var deviceID = topic[2];
        if (topic[4] == "flx") flx = JSON.parse(payload);
        if (topic[4] == "sensor") {
            var config = JSON.parse(payload);
            for (var obj in config) {
                var cfg = config[obj];
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
                }
            }
        }
    }
    function handle_sensor(topic, payload) {
        var sensor = {};
        var msgType = topic[3];
        var sensorId = topic[2];
        var value = JSON.parse(payload);
        if (sensors[sensorId] == null) {
            sensors[sensorId] = new Object();
            sensor.id = sensorId;
            sensor.name = sensorId;
        } else sensor = sensors[sensorId];
        if (sensor.name == sensorId && flx != undefined && sensor.port != undefined) {
            sensor.name = flx[sensor.port].name + " " + sensor.subtype;
        }
        switch (msgType) {
          case "gauge":
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
                var now = new Date().getTime();
                if (now / 1e3 - value[0] > 60) value[1] = 0;
                sensor.time = date;
                sensor.value = value[1];
                sensor.unit = value[2];
                break;

              default:
                break;
            }
            if (sensor.type == null && sensor.unit === "W") {
                $("#choices").append("<div class='form-inline'>" + "<label id='" + sensor.id + "-label' for='" + sensor.id + "' class='control-label col-sm-3'>" + sensor.name + "</label>" + "<select id='" + sensor.id + "'>" + "<option>Consumption</option>" + "<option>Production</option>" + "<option>Ignore</option>" + "</select>" + "</div>");
                $("#" + sensor.id).change(sensor, function(event) {
                    localStorage.setItem(event.data.id, event.target.value);
                    sensors[event.data.id].type = event.target.value;
                });
                var dirVal = localStorage.getItem(sensor.id);
                if (dirVal !== null) {
                    $("#" + sensor.id).val(dirVal);
                }
                sensor.type = $("#" + sensor.id).val();
            }
            if ($("#" + sensor.id + "-label").text() !== sensor.name) {
                $("#" + sensor.id + "-label").text(sensor.name);
            }
            sensors[sensorId] = sensor;
            break;

          default:
            break;
        }
        handle_display(sensor);
    }
    function handle_display(sensor) {
        var productionValue = 0;
        var consumptionValue = 0;
        for (var s in sensors) {
            switch (sensors[s].type) {
              case "Production":
                productionValue += Math.round(sensors[s].value);
                break;

              case "Consumption":
                consumptionValue += Math.round(sensors[s].value);
                break;

              default:
                break;
            }
        }
        var gridValue = consumptionValue - productionValue;
        var selfuseValue = productionValue > consumptionValue ? consumptionValue : productionValue;
        var supplyValue = productionValue > consumptionValue ? productionValue - consumptionValue : 0;
        var obtainedValue = consumptionValue - productionValue > 0 ? consumptionValue - productionValue : 0;
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
    var img = $("#image");
    var scale = img.width() / 1226;
    var pos = img.position();
    if (pos !== undefined) {
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
    var infoPanel = localStorage.getItem("infoVis");
    if (infoPanel === "false") {
        $("#infopanel").hide();
        infoVis = false;
    }
    $(window).resize(function() {
        display_resize();
    });
    $("#toggle").click(function() {
        if (infoVis) $("#infopanel").hide(); else $("#infopanel").show();
        infoVis = !infoVis;
        localStorage.setItem("infoVis", infoVis);
    });
    $("#image").on("load", function() {
        display_resize();
    });
});

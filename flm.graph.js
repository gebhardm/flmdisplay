// state of showing the information panel
var infoVis = true;

$(function() {
    // allow tooltip on datapoints
    $("<div id='tooltip'></div>").css({
        position: "absolute",
        display: "none",
        border: "1px solid #ccc",
        padding: "2px",
        opacity: .9
    }).appendTo("body");
    // assign hover function
    $("#graph").on("plothover", function(event, pos, item) {
        if (item) {
            var itemTime = new Date(item.datapoint[0]);
            var hrs = itemTime.getHours();
            hrs = hrs < 10 ? "0" + hrs : hrs;
            var min = itemTime.getMinutes();
            min = min < 10 ? "0" + min : min;
            var sec = itemTime.getSeconds();
            sec = sec < 10 ? "0" + sec : sec;
            $("#tooltip").html(hrs + ":" + min + ":" + sec + " : " + item.datapoint[1]).css({
                top: item.pageY + 7,
                left: item.pageX + 5
            }).fadeIn(200);
        } else $("#tooltip").hide();
    });
    // toggle the selection
    $("#toggle").click(function() {
        if (infoVis) $("#infopanel").hide(); else $("#infopanel").show();
        infoVis = !infoVis;
    });
});

// link to the web server's IP address for socket connection
var socket = io.connect(location.host);

// the received values
var series = new Array();

var sensors = {};

// the selected series to show
var selSeries = new Array();

var color = 0;

var options = {
    series: {
        lines: {
            show: true,
            steps: true
        },
        points: {
            show: false
        }
    },
    grid: {
        hoverable: true
    },
    xaxis: {
        mode: "time",
        timezone: "browser"
    },
    yaxis: {
        min: 0
    }
};

// process socket connection
socket.on("connect", function() {
    socket.on("mqtt", function(msg) {
        // determine topic and payload
        var name = msg.name;
        var topic = msg.topic.split("/");
        var payload = msg.payload;
        switch (topic[1]) {
          case "sensor":
            handle_sensor(name, topic, payload);
            break;

          default:
            break;
        }
    });
});

// handle the sensor information
function handle_sensor(name, topic, payload) {
    var sensor = {};
    var msgType = topic[3];
    var sensorId = topic[2];
    // handle the sensors
    if (sensors[sensorId] === undefined) {
        sensors[sensorId] = new Object();
        sensor.id = sensorId;
        sensor.name = name;
    } else sensor = sensors[sensorId];
    if (sensor.name !== name) sensor.name = name;
    var value = JSON.parse(payload);
    if (value.length != 3) return;
    if (value[2] !== "W") return;
    // now compute the gauge
    switch (msgType) {
      case "gauge":
        // process currently only the FLM delivered values with timestamp
        // check time difference of received value to current time
        // this is due to pulses being send on occurance, so potentially outdated
        var now = new Date().getTime();
        var diff = now / 1e3 - value[0];
        // drop values that are older than 10 sec - as this is a realtime view
        if (diff > 100) break;
        // check if current sensor was already registered
        var obj = series.filter(function(o) {
            return o.label == sensor.name;
        });
        if (obj[0] === undefined) {
            obj = series.filter(function(o) {
                return o.label == sensor.id;
            });
        }
        // flot.time requires UTC-like timestamps;
        // see https://github.com/flot/flot/blob/master/API.md#time-series-data
        var timestamp = value[0] * 1e3;
        // ...if current sensor does not exist yet, register it
        if (obj[0] === undefined) {
            obj = {};
            obj.label = sensor.name;
            obj.data = [ timestamp, value[1] ];
            obj.color = color;
            color++;
            series.push(obj);
            // add graph select option
            $("#choices").append("<div class='checkbox'>" + "<small><label>" + "<input type='checkbox' id='" + sensor.name + "' checked='checked'></input>" + sensor.name + "</label></small>" + "</div>");
        } else {
            // switch label from id to actual name (config came late)
            if (obj[0].label == sensor.id) {
                obj[0].label = sensor.name;
                $("#" + sensor.id).prop("id", sensor.name).parent().get(0).val(sensor.name);
            }
            obj[0].data.push([ timestamp, value[1] ]);
            // move out values older than 5 minutes
            var limit = parseInt(obj[0].data[0]);
            diff = (timestamp - limit) / 1e3;
            if (diff > 300) {
                var selGraph = new Array();
                for (var i in series) {
                    var selObj = {};
                    selObj.label = series[i].label;
                    selObj.data = series[i].data.filter(function(v) {
                        return v[0] > limit;
                    });
                    selObj.color = series[i].color;
                    selGraph.push(selObj);
                }
                series = selGraph;
            }
        }
        break;

      default:
        break;
    }
    // check the selected checkboxes
    selSeries = [];
    $("#choices").find("input:checked").each(function() {
        var key = $(this).attr("id");
        var s = series.filter(function(o) {
            return o.label == key;
        });
        selSeries.push(s[0]);
    });
    // plot the selection
    var width = $("#graphpanel").width();
    var height = width * 3 / 4;
    height = height > 600 ? 600 : height;
    $("#graph").width(width).height(height);
    $.plot("#graph", selSeries, options);
    // and store the sensor configuration
    sensors[sensorId] = sensor;
}

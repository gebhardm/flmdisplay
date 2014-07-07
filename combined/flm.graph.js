// objects containing the actual sensor data as string and value
var gauge = {};
// link to the web server's IP address for socket connection
var socket = io.connect(location.host);
// prepare graph display
var series = new Array();
var options = {
      xaxis: { mode: "time",
               timezone: "browser" },
      yaxis: { min: 0 },
      selection: { mode: "x" }
    };
// process socket connection
socket.on('connect', function () {
  socket.on('mqtt', function (msg) {
    // split the received message at the slashes
    var message = msg.topic.split('/');
    // the sensor message type is the third value
    var area = message[3];
    // pass the message topic and content to the html part
    $('#message').html(msg.topic + ', ' + msg.payload);
    var sensor = message[2]; // the sensor ID
    var value = JSON.parse(msg.payload); // the transferred payload
    // now compute the gauge
    switch (area) {
      case 'gauge':
        // Sensor handling - transfer the current values from the payload
        gauge["label"] = sensor;
        if (value.length == null) {
          gauge[sensor] = value;
        } else {
          switch (value.length) {
            case 1:
              gauge[sensor] = value[0];
              break;
            case 2:
              gauge[sensor] = value[0];
              break;
            case 3:
              gauge[sensor] = value[1];
              break;
            default: break;
          } // if length
        } // case gauge
        // now pass the data to the graph display
        series = [];
        var serobj = {};
        serobj["label"] = sensor;
        serobj["data"] = [value[0],value[1]];
        series.push(serobj);
        $("graph").plot(series, options);
        break;
      case 'counter':
        break;
      default: break;
    }
  });
  socket.emit('subscribe', {topic : '/sensor/#'});
});
// process selection buttons 
$(document).ready(function() {
  // Selection button handling
  $("#sel_pnl").click( function() { window.location = 'index.html'; });
  $("#sel_cnt").click( function() { window.location = 'panel.html'; });
  $("#sel_gph").click( function() { window.location = 'graph.html'; });
  $("#sel_cht").click( function() { window.location = 'chart.html'; });
});

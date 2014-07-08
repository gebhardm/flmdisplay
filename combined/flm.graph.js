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
			if (value.length == 3) {
				var obj = series.filter(function(o) { return o.label == sensor; });
				if (obj[0] == null) {
					obj ={};
					obj.label = sensor;
					obj.data  = [value[0], value[1]];
					series.push(obj);
				}
				else obj[0].data.push([value[0], value[1]]);
				$("#graph").plot(series, options);
			} // if length
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

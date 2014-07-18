// link to the web server's IP address for socket connection
var socket = io.connect(location.host);
// prepare graph display
var series = new Array();
var options = {
	xaxis : {
		mode : "time",
		timezone : "browser"
	},
	yaxis : {
		min : 0
	}
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
			// process currently only the FLM delivered values with timestamp
			if (value.length == 3) {
				// check time difference of received value to current time
				// this is due to pulses being send on occurance, so potentially not realtime
				var diff = new Date().getTime() / 1000 - value[0];
				diff = (diff < 0 ? -diff : diff);
				if (diff > 10)
					break;
				// check if current sensor was already registered
				var obj = series.filter(function (o) {
						return o.label == sensor;
					});
				// flot.time requires UTC-like timestamps;
				// see https://github.com/flot/flot/blob/master/API.md#time-series-data
				var timestamp = value[0] * 1000;
				// ...if not, register it
				if (obj[0] == null) {
					obj = {};
					obj.label = sensor;
					obj.data = [timestamp, value[1]];
					series.push(obj);
				}
				// ...otherwise, push the current value
				else {
					obj[0].data.push([timestamp, value[1]]);
					// move out values older than 5 minutes
					if ((timestamp - obj[0].data[0][0]) > 300)
						obj[0].data.shift();
				}
				$("#graph").plot(series, options);
			} // if length
			break;
		default:
			break;
		}
	});
	socket.emit('subscribe', {
		topic : '/sensor/#'
	});
});
// process selection buttons
$(document).ready(function () {
	// Selection button handling
	$("#sel_pnl").click(function () {
		window.location = 'index.html';
	});
	$("#sel_cnt").click(function () {
		window.location = 'panel.html';
	});
	$("#sel_gph").click(function () {
		window.location = 'graph.html';
	});
	$("#sel_cht").click(function () {
		window.location = 'chart.html';
	});
	var offset = 20; //px
	var width = $(document).width();
	width -= offset * 2;
	var height = width * 3 / 4;
	$("#graph").width(width).height(height).offset({
		left : offset
	});
});
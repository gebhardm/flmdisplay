// objects containing the actual sensor data as string and value
var sensors = {}, gauge = {}, counters = {};
// create an array of sensor values to pass on to a graph
var gaugeseries = {}, numgauge = 0, numcounter = 0;
// link to the web server's IP address for socket connection
var socket = io.connect(location.host);
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
			if (value.length == null) {
				sensors[sensor] = value;
				gauge[sensor] = value;
			} else {
				switch (value.length) {
				case 1:
					sensors[sensor] = value[0];
					gauge[sensor] = value[0];
					break;
				case 2:
					sensors[sensor] = value[0] + ' ' + value[1];
					gauge[sensor] = value[0];
					break;
				case 3:
					var date = new Date(value[0] * 1000); // the timestamp
					sensors[sensor] = value[1] + ' ' + value[2] + ' (' + date.toLocaleTimeString("en-EN") + ')';
					gauge[sensor] = value[1];
					break;
				default:
					break;
				}
			}
			// create and fill an array of last n gauge
			// also create the corresponding table row to show - only if it not yet exists
			if (gaugeseries[sensor] == null) {
				gaugeseries[sensor] = new Array();
				numgauge++;
				var tablerow = '<tr>\
					<td width=\"40%\" style=\"vertical-align:middle;\"><h3>Gauge ' + numgauge + '</h3>\
					<small id=\"sensor' + sensor + '\">(no value received)</small></td>\
					<td style=\"vertical-align:middle;\"><span id=\"valueSparkline' + sensor + '\">No values</span></td>\
					<td width=\"30%\" style=\"vertical-align:middle;\"><h4>&nbsp;<span id=\"value' + sensor + '\">Unknown</span></h4></td>\
					</tr>';
				$('#gauge').append(tablerow);
			};
			if (gaugeseries[sensor].length == 60)
				gaugeseries[sensor].shift();
			gaugeseries[sensor].push(gauge[sensor]);
			// now pass the data to the html part
			$('#sensor' + sensor).html('(Sensor ' + sensor + ')');
			$('#value' + sensor).html(sensors[sensor]);
			$('#valueSparkline' + sensor).sparkline(gaugeseries[sensor], {
				type : 'line',
				width : '200',
				height : '50',
				tooltipFormat : '<span class="text-info bg-info">{{x}}:{{y}}</span>'
			});
			break;
		case 'counter':
			var date = new Date(value[0] * 1000); // the timestamp
			if (counters[sensor] == null) {
				numcounter++;
				// put always two Counters into one table row
				var tabcol = '<td style=\"vertical-align:middle;\">\
					<h4>Counter ' + numcounter + '<br/>\
					<small id=\"counter' + sensor + '\"></small></h4><br/>\
					<em><span id=\"count' + sensor + '\"></span></em></td>';
				if (numcounter % 2 == 1) {
					var tabrow = '<tr id=\"cr' + numcounter + '\"></tr>';
					$('#counter').append(tabrow);
					$('#cr' + numcounter).append(tabcol);
				} else
					$('#cr' + (numcounter - 1)).append(tabcol);
			}
			if (value[2] == 'Wh')
				counters[sensor] = value[1] / 1000.0 + ' kWh';
			else
				counters[sensor] = value[1] + ' ' + value[2];
			//+ ' (' + date.toLocaleTimeString("en-EN") + ')';
			$('#counter' + sensor).html(sensor);
			$('#count' + sensor).html(counters[sensor]);
			break;
		default:
			break;
		}
	});
	socket.emit('subscribe', {
		topic : '/sensor/#'
	});
});
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
});
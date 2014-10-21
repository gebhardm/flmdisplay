// objects containing the actual sensor data as string and value
var sensors = {}, gauge = {}, displays = {};
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
		var unit = '';
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
					unit = '';
					break;
				case 2:
					sensors[sensor] = value[0] + ' ' + value[1];
					gauge[sensor] = value[0];
					unit = value[1];
					break;
				case 3:
					var date = new Date(value[0] * 1000); // the timestamp
					sensors[sensor] = value[1] + ' ' + value[2] + ' (' + date.toLocaleTimeString("en-EN") + ')';
					gauge[sensor] = value[1];
					unit = value[2];
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
					<td style=\"vertical-align:middle;\"><div id=' + sensor + '></div></td>\
					</tr>';
				$('#gauge').append(tablerow);
				displays[sensor] = new JustGage({
				  id: sensor,
				  value: gauge[sensor],
				  title: 'Gauge ' + numgauge,
				  label: unit,
				  min: 0,
			  	  max: (gauge[sensor]>250?gauge[sensor]:250)
				});
			};
			if (gaugeseries[sensor].length == 60)
				gaugeseries[sensor].shift();
			gaugeseries[sensor].push(gauge[sensor]);
			// now pass the data to the html part
			$('#sensor' + sensor).html('(Sensor ' + sensor + ')');
                        displays[sensor].refresh(gauge[sensor]);
			if (gauge[sensor] > displays[sensor].txtMaximum) displays[sensor].refresh(displays[sensor].originalValue,gauge[sensor]);
			break;
		case 'counter':
			break;
		default:
			break;
		}
	});
	socket.emit('subscribe', {
		topic : '/sensor/#'
	});
});

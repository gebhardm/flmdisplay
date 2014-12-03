// objects containing the actual sensor data as string and value
var gauge = {}, displays = {};
// create an array of sensor values to pass on to a graph
var numgauge = 0;
var limit = 0;
// link to the web server's IP address for MQTT socket connection
var client = new Paho.MQTT.Client("192.168.0.50", 1883, "FLMgauge");
// define callback routines
client.onConnect = onConnect;
client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;
// connect to MQTT broker
client.connect({onSuccess:onConnect});

function onConnect() {
	console.log("connected");
	client.subscribe("/sensor/#");
};

function onConnectionLost(responseObj) {
	if (responseObj.errorCode !== 0) 
		console.log("onConnectionLost:"+responseObj.errorMessage);
};

function onMessageArrived(msg) {
	console.log(msg);
	// split the received message at the slashes
	var message = msg.topic.split('/');
	// the sensor message type is the third value
	var area = message[3];
	// pass the message topic and content to the html part
	$('#message').html(msg.topic + ', ' + msg.payload);
	var sensor = message[2]; // the sensor ID
	var value = JSON.parse(msg.payloadString); // the transferred payload
	var unit = '';
	// now compute the gauge
	switch (area) {
	case 'gauge':
		// Sensor handling - transfer the current values from the payload
		if (value.length == null) {
			gauge[sensor] = value;
			unit = '';
		} else {
			switch (value.length) {
			case 1:
				gauge[sensor] = value[0];
				unit = '';
				break;
			case 2:
				gauge[sensor] = value[0];
				unit = value[1];
				break;
			case 3:
				var date = new Date(value[0] * 1000); // the timestamp
				var now = new Date().getTime();
				if ((now / 1000 - value[0]) > 60) value[1] = 0; // if too old, set to 0
				gauge[sensor] = value[1];
				unit = value[2];
				break;
			default:
				break;
			}
		}
		// create and fill an array of last n gauge
		// also create the corresponding table row to show - only if it not yet exists
		if (displays[sensor] == null) {
			numgauge++;
			// get document width to scale table
			var offset = 40;
			var width = $(document).width() - offset * 2;
			// put always two gauges into one table row
			var tabcell = '<div id="' + sensor + '"></div>';
			if (numgauge % 2 == 1) {
				var tabrow = '<div class="pure-g">' +
				'<div class="pure-u-1-2" id="gc' + numgauge + '"></div>' +
				'<div class="pure-u-1-2" id="gc' + (numgauge + 1) + '"></div>' +
				'</div>';
				$('#gauge').append(tabrow);
			};
			$('#gc' + numgauge).append(tabcell);
			if (unit=='W') limit = 250;
			else if (unit=='°C') limit = 50;
			else limit = 100;
			displays[sensor] = new JustGage({
					id : sensor,
					value : gauge[sensor],
					title : sensor,
					label : unit,
					min : 0,
					max : (gauge[sensor]>limit?gauge[sensor]:limit)
					});
			$('#sensor' + sensor).html('(Sensor ' + sensor + ')');
		};
		// now pass the data to the html part
		if (gauge[sensor] > displays[sensor].txtMaximum)
			displays[sensor].refresh(displays[sensor].originalValue, gauge[sensor]);
		else
			displays[sensor].refresh(gauge[sensor]);
		break;
	case 'counter':
		break;
	default:
		break;
	}
};

// link to the web server's IP address for socket connection
var socket = io.connect(location.host);

socket.on("connect", function () {
	// emit the subscription
	socket.emit("subscribe", {
		topic : "/device/#"
	});
	socket.emit("subscribe", {
		topic : "/sensor/+/gauge"
	});
	// objects containing the actual sensor data
	var sensors = {};
	var limit = 3600;
	// initialize the consumption gauges
	var grid = new JustGage({
			id : "grid",
			value : 0,
			title : "Grid",
			label : "W",
			min : 0,
			max : limit,
			decimals : 0
		});
	var production = new JustGage({
			id : "production",
			value : 0,
			title : "Production",
			label : "W",
			min : 0,
			max : limit,
			decimals : 0
		});
	var consumption = new JustGage({
			id : "consumption",
			value : 0,
			title : "Consumption",
			label : "W",
			min : 0,
			max : limit,
			decimals : 0
		});
	// handle the received MQTT messages
	socket.on("mqtt", function (msg) {
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
				} else
					sensors[cfg.id].name = cfg.function;
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
		} else
			sensor = sensors[sensorId];
		// now compute the received mqttMessage
		switch (msgType) {
		case "gauge":
			// handle the payload to obtain gauge values
			switch (value.length) {
			case 1:
				break;

			case 2:
				break;

			case 3:
				if (value[2] !== "W")
					break;
				var date = new Date(value[0] * 1e3);
				// the timestamp
				var now = new Date().getTime();
				if (now / 1e3 - value[0] > 60)
					value[1] = 0;
				// if too old, set to 0
				sensor.time = date;
				sensor.value = value[1];
				sensor.unit = value[2];
				break;

			default:
				break;
			}
			// now build the gauge display
			if (sensor.type == null && sensor.unit === "W") {
				$("#choices").append("<div class='form-inline'>" + "<label for='type " + sensor.name + "' class='control-label span2'>" + sensor.name + "</label>" + "<select id='type " + sensor.name + "'>" + "<option>Consumption</option>" + "<option>Production</option>" + "</select>" + "</div>");
			}
			// compute the selected sensor type
			var selElt = document.getElementById("type " + sensor.name);
			sensor.type = selElt.options[selElt.selectedIndex].value;
			sensors[sensorId] = sensor;
			break;

		default:
			break;
		}
		handle_display(sensor);
	}
	function handle_display(sensor) {
		var gridValue = 0;
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
		gridValue = consumptionValue - productionValue;
		// update the gauges
		if (gridValue > limit) {
			grid.refresh(gridValue, gridValue);
		} else
			grid.refresh(gridValue);
		if (productionValue > limit) {
			production.refresh(productionValue, productionValue);
		} else
			production.refresh(productionValue);
		if (consumptionValue > limit) {
			consumption.refresh(consumptionValue, consumptionValue);
		} else
			consumption.refresh(consumptionValue);
	}
});

// link to the web server's IP address for socket connection
var socket = io.connect(location.host);
// prepare graph display
var series = new Array();
var options = {
                xaxis: { mode: "time",
                         timezone: "browser" },
                yaxis: { min: 0 }
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
                                // check if current sensor was already registered
				var obj = series.filter(function(o) { return o.label == sensor; });
                                // ...if not, register it
				if (obj[0] == null) {
					obj ={};
					obj.label = sensor;
					obj.data  = [value[0], value[1]];
					series.push(obj);
				}
				// ...otherwise, push the current value
				else { 
                                        obj[0].data.push([value[0], value[1]]);
                                        // reduce the datavolume to n values per series
                                        if (obj[0].data.length > 300) {
                                                var limit = obj[0].data[0][0];
                                                var selGraph = new Array();
                                                for (var i in series) {
                                                        var selObj = {};
                                                        selObj.label = series[i].label;
                                                        selObj.data  = series[i].data.filter(function(v) {return v[0] > limit;});
                                                        selGraph.push(selObj);
                                                }
                                                series = selGraph;
                                        }
                                }
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
        var offset = 20; //px
        var width = $(document).width();
        width -= offset * 2;
        var height = width * 3 / 4;
        $("#graph").width(width).height(height).offset({left:offset});
});

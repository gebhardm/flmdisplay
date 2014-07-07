        // objects containing the actual sensor data
          var sensors = {}, readings = {};
        // create an array of sensor values to pass on to a graph
          var sensorvalues = {}, numgauge = 0;
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
                    // now compute the readings
                    switch (area) {
                        case 'gauge':
                            // Sensor handling
                            var sensor = message[2]; // the sensor ID
                            var value = JSON.parse(msg.payload);
                            if (value.length == null) {
                                sensors[sensor] = value;
                                readings[sensor] = value;
                            } else {
                                switch (value.length) {
                                    case 1:
                                        sensors[sensor] = value[0];
                                        readings[sensor] = value[0];
                                        break;
                                    case 2:
                                        sensors[sensor] = value[0] + ' ' + value[1];
                                        readings[sensor] = value[0];
                                        break;
                                    case 3:
                                        var date = new Date(value[0]*1000); // the timestamp
                                        sensors[sensor] = value[1] + ' ' + value[2] + ' (' + date.toLocaleTimeString("en-EN") + ')';
                                        readings[sensor] = value[1]; // store the actual value of the sensor to push
                                        break;
                                    default: break;
                                }
                            }
                            // create and fill an array of last n readings
                            // also create the corresponding table row to show - only if it not yet exists
                            if (sensorvalues[sensor] == null) {
                                sensorvalues[sensor] = new Array();
                                numgauge++;
                                var tablerow = '<tr>\
<td width=\"40%\" style=\"vertical-align:middle;\"><h3>Gauge '+numgauge+'</h3><small id=\"sensor'+sensor+'\">(no value received)</small></td>\
<td style=\"vertical-align:middle;\"><span id=\"valueSparkline'+sensor+'\">No values</span></td>\
<td width=\"30%\" style=\"vertical-align:middle;\"><h4>&nbsp;<span id=\"value'+sensor+'\">Unknown</span></h4></td>\
</tr>';
                                $('table').append(tablerow);
                            };
                            if (sensorvalues[sensor].length == 60)
                                sensorvalues[sensor].shift();
                            sensorvalues[sensor].push(readings[sensor]);
                            // now pass the data to the html part
                            $('#sensor'+sensor).html('(Sensor ' + sensor + ')');
                            $('#value'+sensor).html(sensors[sensor]);
                            $('#valueSparkline'+sensor).sparkline(sensorvalues[sensor], {
                                type: 'line', width: '200', height: '50',
                                tooltipFormat: '<span class="text-info bg-info">{{x}}:{{y}}</span>' });
                            break;
                        case 'counter': break;
                        default: break;
                    }
         });
         socket.emit('subscribe', {topic : '/sensor/#'});
        });
        $(document).ready(function() {
        // Selection button handling
          $("#sel_pnl").click( function() { window.location = 'index.html'; });
          $("#sel_cnt").click( function() { window.location = 'panel.html'; });
          $("#sel_gph").click( function() { window.location = 'graph.html'; });
          $("#sel_cht").click( function() { window.location = 'chart.html'; });
        });

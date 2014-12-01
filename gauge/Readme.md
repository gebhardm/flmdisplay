This is an alternative Fluksometer gauge visualization using the [Yahoo Pure CSS](http://purecss.io).<br>
It is yet in an experimental stage.

To use it you have to install [node.js](http://nodejs.org) together with the modules "mqtt" (the MQTT bindings), "socket.io" (for the web frontend communication) and "mdns" (for detecting the MQTT broker - this most likely needs to be changed to a manual internet address if you don't have an advertising broker...)

`var mqttclient = mqtt.createClient(service.port, service.addresses[0]);`

becomes

`var mqttclient = mqtt.createClient('<broker port, usually 1883>', '<broker ip address, usually the address of the computer e.g. Mosquitto is running on>')`

Note: There might be an option to perform this directly on a visualizing device; this is yet to be sought...

<img src="FLM_pure_gauge.png" width=500px>

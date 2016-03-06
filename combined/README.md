# About

*serve_flmdata.js* is a Javascript script running on **node.js** to receive and persist Fluksometer readings in a MySQL database and visualizing them in a panel and chart web service - so it needs [node.js](http://nodejs.org) installed...
It connects to the FLM's MQTT broker on the discovered IP address(es) using the multicast DNS service discovery - so there is no further configuration to change beside the required setup steps described in the following.

# Setup on a Raspberry Pi

To use the combined Fluksometer persistence and visualization script you have to perform some preparation steps. 

## Foundation

Foundation to all following steps is a clean installation of Raspbian/Debian. Get the current distribution from [www.raspberrypi.org/downloads](http://www.raspberrypi.org/downloads). I chose the Jessie lite variant.

On fresh install perform the usual RasPi configuration steps

	sudo raspi-config

Set up file system expansion and locale settings; use overclocking to your convenience.<br>
After rebooting get the system up to date

	sudo apt-get update && sudo apt-get upgrade

As always, heed Dogbert's tech advice and do better more than less times a

	sudo reboot

## Installing the database

As the combined script stores Fluksometer data, a proper database must be installed; in my case it is SQlite.

	sudo apt-get install sqlite3

This installs the database and all dependent packages. Everything else is done from the serving script.

## Installing node.js

To run the persistence and visualization script install [node.js](http://nodejs.org). For this you may take the sources from [http://github.com/nodejs/node](http://github.com/nodejs/node) and compile node on your Raspberry Pi. Use following command sequence - make sure to select the branch to your convenience

	cd ~
	git clone http://github.com/nodejs/node
	cd node
	git checkout <the node.js release you want to install>
	./configure
	nohup make &
	tail nohup.out
	sudo make install

Note that the make process takes quite some while on a RasPi, so be patient; you may start the *make* process also directly (thus, without *nohup* and *&*); I chose to run it in the background with "*nohup make &*" allowing a logoff during processing. By the *tail* command you may have a look what’s currently going on. You'll recognize a finished *make* either if the *nohup.out* does not increase any further or the *tail* provides evidence that the *make* ended after all its compiling steps - if there where errors, hey, [Google is your friend](http://www.giyf.com)...
 
After the *sudo make install* check if node was installed properly 

	node -v
	npm -v

This shows the respective versions of *node* and the *node package manager*.

As an easy alternative **you may obtain a precompiled installation from [Adafruit Industries](https://www.adafruit.com/)**; follow the [description](https://learn.adafruit.com/node-embedded-development/installing-node-dot-js).

To install *mdns* with *npm* on a Raspberry Pi you need to have installed also the avahi compatibility library.

	sudo apt-get install libavahi-compat-libdnssd-dev

Now install the mqtt, mdns, sqlite3, and socket.io modules in your home directory with

	cd ~
	npm install mdns mqtt socket.io sqlite3

or just do a

    npm install
    
utilizing the provided [package.json](package.json) file.

Be aware that these modules evolve; there was an issue with incompatible changes using socket.io: v0.9 behaves differently than v1.0 - so, even though I tested the stuff, it may not work with a next version of the used modules... Again, as this is free stuff, help yourself finding out what's up - there are zillions of possibilities, what has happened. (Have you used **git checkout**? Have you called **./configure**?)

As *mdns* uses a compatibility layer, be aware that it throws warnings on use; follow the links within the warnings to get an understanding what has happened (and then ignore them). 

## Starting the script

Now the preparation is finished and you may continue with the actual Fluksometer service. Install it via *git*

	cd ~
	git clone http://github.com/gebhardm/flmdisplay

To start the **combined** persistence and visualization service, enter the *combined* folder and start the script

	cd flmdisplay/combined
	./flmdata.sh

After start, the script checks if the corresponding database exists; if not, it creates the corresponding table. Now the script discovers the existing Fluksometer MQTT brokers and subscribes to the sensor topics.

If there is no message that your FLM was detected (the message shows the IP address and the corresponding port) something went wrong with the MDNS installation; check this - again, [Google is your friend](http://www.giyf.com)...

On detection of the FLM, the script starts to insert received values (i.e. mqtt messages on topic **/sensor/#**) into the database for later retrieval, e.g. by the chart. 

With the script also a web server is started that you can reach on the RasPi’s IP address from any computer in the LAN; access the visualization on port 1080

	http://"RasPi IP address":1080

Note that the service also advertises its existence; check with a Bonjour browser; so alternatively you may access the service also (at least on a Mac) via

	http://raspberrypi.local:1080

This assumes that you kept the default hostname; it may be different if you changed it, for example during *raspi-config*.

That's it. Now you should have an up and running local Fluksometer data visualization with gauge, panel, graph, and chart.

There are alternative folders containing "stripped" parts of the service, for example everything but the chart/persistence and the single gauge display. I keep experimenting on this.

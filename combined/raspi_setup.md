# About

serve_flmdata.js is a Javascript script running on **node.js** to receive and persist Fluksometer readings in a MySQL database and visualizing them in a panel and chart web service - so it needs node.js installed...
It connects to the FLM's MQTT broker on the discovered IP address(es) using the multicast DNS service discovery - so there is no further configuration to change beside the required setup steps described in the following.

# Setup on a Raspberry Pi

To use the (combined) Fluksometer persistence and visualization script you have to perform some preparation steps. 

## Foundation

Foundation to all following steps is a clean installation of Raspbian Debian Wheezy, in particular the version June 2014 (2014-06-20) as available on www.raspberrypi.org/downloads
On fresh install perform the usual RasPi configuration steps

> sudo raspi-config

Set up file system expansion and locale settings; use overclocking to your convenience. 
After reboot get the system up to date

> sudo apt-get update && sudo apt-get upgrade

## Installing the database

As the combined script stores Fluksometer data, a proper database must be installed; in my case it is MySQL.

> sudo apt-get install mysql-server

This installs the database and all dependent packages. During installation you are asked for a root password of the database; I chose 'raspberry' for this (as a no-brainer to the default RasPi Wheezy password)
Log into the database to create the schema used for storing Fluksometer data:

> mysql -u root -p

> mysql> create database flm;

> mysql> use flm;

By this you log into the database as root; provide above given password when asked. Create the database used in the logging script; chose whatever you like, but be sure to have the same database applied also in the scripts. With the “use“ command you change to the created database for further actions.

To use the MySQL database for storing data not only via the root user you have to set up a corresponding "other" user; this can be done from the MySQL command line by following commands (assuming you are still logged on to the database - if not, use 'mysql -u root -p flm' from the prompt):

> mysql> create user 'pi'@'localhost' identified by 'raspberry';

> mysql> grant all privileges on flm.* to 'pi'@'localhost';

> mysql> flush privileges;

> mysql> set password for 'pi'@'localhost' = password('raspberry');

> mysql> quit

Now you may log on to the database also as user 'pi':

> pi@raspberry ~ $ mysql -u pi -p flm

> mysql> show databases;

## Installing node.js

To run the persistence and visualization script install node.js; easiest from http://github.com/joyent/node. Use following command sequence

> cd ~

> git clone http://github.com/joyent/node

> cd node

> git checkout v0.10.29-release

> ./configure

> nohup make &

> tail nohup.out

> sudo make install

Note that the make process takes quite some while on a RasPi, so be patient; you may start the "make" also directly; I chose to run it in the background with "nohup make &" allowing a logoff during processing. By the tail command you may have a look what’s currently going on.
 
After the make install check if node was installed properly 

> node -v

> npm -v

This shows the respective versions of node and the node package manager.

To install mdns with npm on a Raspberry Pi you need to have installed also the avahi compatibility library.

> sudo apt-get update

> sudo apt-get install libavahi-compat-libdnssd-dev

Now install the mqtt, mdns, mysql, and socket.io modules in your home directory with

> cd ~

> npm install mdns mqtt socket.io mysql

Be aware that these modules evolve; there was an issue with incompatible changes using socket.io: v0.9 behaves differently than v1.0 - so, even though I tested the stuff, it may not work with a next version of the used modules...

As mdns uses a compatibility layer, be aware that it throws warnings on use; follow the links within the warnings to get an understanding what has happened (and then ignore them). 

## Starting the script

Now the preparation is finished and you continue with the actual Fluksometer service. Install it via git

> cd ~

> git clone http://github.com/gebhardm/flmdisplay

To start the combined persistence and visualization service enter the combined folder and start the script

> cd flmdisplay/combined

> ./flmdata.sh

After start the script checks if the persistence table in the database FLM exists; if not, it creates the corresponding persistence table. Now the script discovers the existing Fluksometer MQTT brokers and subscribes to the sensor topics. Then the script starts to insert received values (i.e. mqtt messages on topic /sensor/#) into the database for later retrieval, e.g. by the chart. This you may check also within the MySQL database

> mysql -u pi -p flm

> show tables;

> select count(*) from flmdata;

With the script also a web server is started that you can reach on the RasPi’s IP address from any computer in the LAN; access the visualization on port 1080

> http://<RasPi IP>:1080

Note that the service also advertises its existence; check with a Bonjour browser; so alternatively you may access the service also (at least on a Mac) via

> http://raspberrypi.local:1080
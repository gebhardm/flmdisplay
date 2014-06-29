# Setup on a Raspberry Pi

To use the (combined) Fluksometer persistence and visualization script you have to perform some preparation steps. These are described in the following.

serve_flmdata.js is a Javascript script running on **node.js** to persist Fluksometer readings in a MySQL database and visualizing it in a panel and chart web service - so it needs node.js installed...
It connects to the FLM's MQTT broker on the discovered IP address(es) using the multicast DNS service discovery - so there is no further configuration to change.

## Installing the database

As the combined script stores Fluksometer data, a proper database must be installed; in my case it is MySQL.

> sudo apt-get install mysql-server mysql-client

This installs the database and all dependent packages not already installed. During installation you are asked for a root password of the database; I chose 'raspberry' for this (as a no-brainer to the default RasPi wheezy password)
Log into the database to create the schema used for storing Flukso data:

> mysql -u root -p

> mysql> create database flm;

> mysql> use flm;

By this you log into the database as root; provide above given password when asked. Create the database used in the logging script; chose whatever you like, but be sure to have the same database applied also in the scripts. With the use command you change to the created database for further actions.

To use the mySQL database for storing data not only via the root user you have to set up a corresponding "other" user; this can be done from the mySQL command line by following commands (assuming you are still logged on to the database - if not, use 'mysql -u root -p flm' from the prompt):

> mysql> create user 'pi'@'localhost' identified by 'raspberry';

> mysql> grant all privileges on flm.* to 'pi'@'localhost';

> mysql> flush privileges;

> mysql> set password for 'pi'@'localhost' = password('raspberry');

> mysql> quit

Now you may log on to the database also as user 'pi':

> pi@raspberry ~ $ mysql -u pi -p flm

> mysql> show databases;

> mysql> show tables;

> mysql> select count(*) from flmdata;

On fresh setup, there is of course no table flmdata; this is created on first starting the combined script.

## Installing node.js

To run the script install node.js; easiest from http://github.com/joyent/node. Install node.js using the command sequence

> cd ~

> git clone http://github.com/joyent/node

> cd node

> git checkout v0.10.29-release

> ./configure

> make

> sudo make install

Note that the make process takes quite some while on a RasPi; so be patient; you may start the "make" with "nohup make &" to run it in background and allow a logoff during processing. 
Check if node was installed properly 

> node -v

> npm -v

This shows the respective versions of node and the package installer.

To install mdns with npm on a Raspberry Pi you need to have installed also the avahi compatibility library.

> sudo apt-get update

> sudo apt-get install libavahi-compat-libdnssd-dev

Now install the mqtt, mdns, mysql, and socket.io modules in your home directory the with

> cd ~

> npm install mdns mqtt socket.io mysql

Be aware that these modules evolve; there was an issue with incompatible changes using socket.io as v0.9 behaves differently than v1.0 - so, even though I tested the stuff, it may not work with a next version of the used modules...

As mdns uses a compatibility layer, be aware that it throws warnings on use; follow the links within the warnings to get an understanding what has happened (and then ignore them). 

## Starting the script

To start the combined persistence and visualization service enter the combined folder and start the script

> cd /flmdata/combined

> ./flmdata.sh

After start the script checks if the persistence table in the database FLM exists; if not, it creates the table. Now the script discovers the existing Fluksometer MQTT brokers and subscribes to the sensor topics. Then the script starts to insert received values (i.e. mqtt messages on topic /sensor/#) into the database for later retrieval, e.g. by the chart.
# How-to and Setup Guide
Aggregated  by Pietro Spina; see also https://www.flukso.net/content/how-mqtt-nicely-designed-gauges

This guide should get the scripts that don't need configuration up and running on your server. Pieces are pulled from the diverse readme files on [github](http://github.com/gebhardm/flmdisplay) and others are specific to a clean installation of **ubuntu-14.04-server**. You should still read all README files and forum topics because there is a lot of explanation and information in them.

This guide is written with the intent that you can just copy and paste as you read through. From personal experience I know this is an easy way to get in over your head. I said above that this is based on a **clean install**, and what I mean is that once you have ubuntu installed and you are looking at a command prompt this is the first thing you do. If you have other services listening at **port 1080** the combined script will not work. (you can of course modify it to run on whatever port you desire)

With the hopes that maybe this guide will help get this project installed on more devices and more folks hacking on it.

## Environment

Set up the environment/Get all the pieces in place

### Update

> sudo apt-get update

> sudo apt-get upgrade

### Git

> sudo apt-get install git

### mySQL

> sudo apt-get install mysql-server

You will be prompted to set a root password.

Tell mySQL to generate the directory structure it needs to store its databases and information

> sudo mysql_install_db

Run a simple security script. You can change your root password for mySQL here or say no to the first question and answer the rest of the questions yes.

> sudo mysql_secure_installation

Set up the mySQL database to have all the tables and settings that the scripts will expect

> mysql -u root -p

> mysql> create database flm;

> mysql> use flm;

> mysql> create user 'pi'@'localhost' identified by 'raspberry';

> mysql> grant all privileges on flm.* to 'pi'@'localhost';

> mysql> flush privileges;

> mysql> set password for 'pi'@'localhost' = password('raspberry');

> mysql> quit

### node.js
You may need to 

> sudo apt-get install software-properties-common

if the add-apt-repository below fails.

> sudo add-apt-repository ppa:chris-lea/node.js

> sudo apt-get update

> sudo apt-get install nodejs build-essential libavahi-compat-libdnssd-dev

### The script

Install the script(s) using git below or download them as a zip file directly from [github](http://github.com/gebhardm/flmdisplay)

> cd ~

> git clone git://github.com/gebhardm/flmdisplay/

Install the required node modules in your home directory

> cd ~

> npm install mqtt socket.io mdns mysql

After installation you'll recognize a new folder node_modules containing the required stuff.

Now you may start the combined script

> cd combined/

> ./flmdata.sh

If you have gotten through without errors then everything should be up and running. If you want to double check try 
   
> pgrep -a node 

This will list the process ID of each node instance and what the script name is at that pid. (useful if you want to kill a specific process.)

You will want to know what the local IP address of your machine is.
Try this if you are using wired ethernet (wlan0 if wireless)

> ifconfig eth0 | grep 'inet addr:' | cut -d: -f2 | awk '{ print $1}'

or just type ifconfig and read it yourself.

On another computer you should then go to the local address of your server to access the chart and panel.

> http://"local IP address":1080

Remember, that the script is dumping data every second into the database. (even in the case of zero data)
Lots of info in there to manipulate. There are plenty of ways to get the data out if you want to do some presentation. Tab separated files can be dumped directly from mySQL. 
PHPmyAdmin can pop the data out in a spreadsheet readable file...  Some assembly may be required...

Size: With 3 Fluksometers and therefore 9 current clamp sensors recording data every second I am seeing the database become 97MB in about a day. I'd love some feedback regarding your experience with the speed of drive space consumption in your set up. (I plan on making more precise measurements)
But just a heads up, you should plan accordingly, whether it be large enough drives or clean up scripts...

Feedback and corrections appreciated.
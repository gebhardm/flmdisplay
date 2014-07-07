# Combined version of persistence, panel and chart

This folder contains a combined version of the persistence, panel, and chart service;
so there is no need to run the other scripts separately.

Start it with ./flmdata.sh after completing the required setup.

(c) 2014, Markus Gebhard, under MIT License - see License.txt

## Setup

For setup on ubuntu-14.04-server refer to [Pietro Spina's ubuntu setup](ubuntu_setup.md)

For setup on Raspberry Pi Wheezy refer to [RasPi setup](raspi_setup.md)

## Compatibility issues

Please note: Browser Javascript capabilities vary; especially time and timezone handling is
not consistantly provided throughout the different existing implementations and
versions; what works in current browser versions may not work on an "older" device with
a previous version of the same browser and vice versa.

As an example: The iPad 1 Safari browser (iOS 5.1.1)
does not work with the current Chart display as date.parse is incompatible with current
Chrome, Safari, IE, and Firefox versions; if you experience an issue, well, you may alter the
code in the corresponding frontend Javascript file as there seems to exist no common implementation.
This is an issue that not sufficiently can be fixed.

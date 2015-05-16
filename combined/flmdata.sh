#!/bin/sh
export AVAHI_COMPAT_NOWARN=1
# start the script with "no hang-up" to detect potential uncaught errors
# to have no output catching, just delete the "nohup"
nohup node serve_flmdata.js &

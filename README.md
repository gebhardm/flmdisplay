#flmdisplay

Visualization hacks for the Fluksometer

##Content

This repository contains the collected scripts implemented to persist and visualize readings from the www.flukso.net provided Fluksometer, an open source, community smart metering appliance.

It actually is a fork of 
http://github.com/gebhardm/energyhacks/tree/master/RaspberryPi
to keep up with evolving reuse components, for example socket.io.

All folders contain a README file that describes the intention of the contained script and its usage.

Note that css/ and js/ are just script storages of reuse components without further information - on these you have to use the original sources and respect the corresponding licences...

Make sure that the web serving folders have access to these folders via symbolic links (Windows seems to break them). If the links do not exist, remove the css and js "file" (rm css && rm js) and reestablish the required links (ln -s ../css/ css && ln -s ../js/ js) - otherwise the required JavaScript libraries will not be found...

Note that as also this code evolves, there are different releases denoting different stages or sets of features provided along the development.

See the respective release menu in github (https://github.com/gebhardm/flmdisplay/releases) or have a look with 'git tag' - check out the version to your
convenience.

All code provided under the respective licences; if not denoted otherwise the MIT licence is the one to care about (http://opensource.org/licenses/MIT)...

(c) 2014, Markus Gebhard, Karlsruhe

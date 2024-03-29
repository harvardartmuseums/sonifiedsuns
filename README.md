# :warning: ARCHIVED

The Lightbox program ended on July 31, 2022. All associated projects have been retired and are no longer supported.

# Sonified Suns

This project, based on Jeff Steward's Suns Explorer, represents randomly chosen objects from the Harvard Art Museums' collections in sound. Using color data from the Harvard Art Museums' API, the project displays the "suns" of color&mdash;concentric circles scaled in proportion to their significance in the work&mdash;that Jeff's project centers around, while simultaneously producing an auditory equivalent. A voice reads basic dogtag information on the current work before tones sound, their pitch mapped to hue, their volume to saturation, their echo to work size, and their timing to percentage of the work. Speech interaction allows visitors to comment, hear an explanation, or hear others' comments.

To view this project, open http://sonifiedsuns.herokuapp.com/screens.html in Chrome on a desktop computer with speakers.

To display the images being described, and to use speech interaction, open http://sonifiedsuns.herokuapp.com/shades.html in Chrome on a desktop computer with a microphone attached. Be sure the input volume is low enough that it doesn't pick up the speech generation from http://sonifiedsuns.herokuapp.com/screens.html. Enter the id from http://sonifiedsuns.herokuapp.com/screens.html when prompted.

To offer visual controls and messages, open http://sonifiedsuns.herokuapp.com/control.html on a mobile device and enter the id from http://sonifiedsuns.herokuapp.com/screens.html when prompted. Displays best if opened from the home screen of an iPad.


To open the project in the Lightbox, add "?id=" and any four-digit number to all three URLs. The projects will automatically reload at 8am every morning, staying linked to the specified id.

Note: further iPad/iPhone controls and projector displays can be opened using the same id.

## Requirements

* NodeJS
* Harvard Art Museums API Key (get one [here](http://www.harvardartmuseums.org/collections/api))

### Installation
```
npm install 
```

### Start the server
```
npm start
```

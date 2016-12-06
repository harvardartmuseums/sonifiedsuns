// Based on Suns Explorer, by Jeff Steward
// Uses the Harvard Art Museums database API 
// to sonify artworks with color and dimension
// data
//
// Gavi Levy Haskell, 28 October 2016
// Harvard Art Museums
//
//    Given the extensive use of Web Audio API
//    and Speech API, this is only designed to
//    work in Chrome
//
//    Note: I've made some eccentric choices--
//    nulling variables, reusing objects in 
//    peculiar ways, and notably, reloading the
//    page once a day--to account for some of
//    the scope/memory leak problems Javascript 
//    has, given that this is a memory-intensive
//    program intended to run over an extended
//    period of time.

"use strict";


//---------------------------------//
// CONSTANTS AND PRELOADED OBJECTS //
//---------------------------------//

var socket = io('/screens-namespace'); // to synchronize w/projector
var context = new AudioContext(); // holds tones
var synthesis = window.speechSynthesis;
var date = new Date(); 
var counter = 0; // number of 15s rounds so far
var threshold = 25; // rounds before erasing sun
var replay = false; // replay requested
var previous = null; // previous object (to replay)
var current = null; // current object
var explanation = false; // explanation requested
var done = true;
var stuck = 0;
var restartTimer = 30;
var transitionTimer = 2;
var sonificationLength = 15;
var speechVolume = .1;
var startTime = 9;
var endTime = 17;
var explanationFrequence = 9;
var dimensionCap = 500;


var decadePattern = /[0-9]s(?!t)/i; // "30s"/"40s"/etc.

// list of pitches pleasant together
// (d major scale)
var possibleNotes = [
	//D      F#      A
	73.42, 92.50, 110.00, 
	146.83, 185.00, 220.00, 
	293.66, 369.99, 440.00, 
	587.33, 739.99, 880.00, 
	1174.66, 1479.98, 1760.00, 
	2349.32
];

// speech objects to read label information
var speechT = new SpeechSynthesisUtterance();
speechT.volume = speechVolume;
speechT.lang = 'en-US';

var voiceEnglish = new SpeechSynthesisUtterance();
voiceEnglish.volume = speechVolume;
var voiceBritishEnglish = null;
var voiceFrench = null;
var voiceGerman = null;
var voiceSpanish = null;
var voiceIndonesian = null;
var voiceItalian = null;
var voiceJapanese = null;
var voiceKorean = null;
var voiceDutch = null;
var voicePolish = null;
var voicePortuguese = null;
var voiceRussian = null;
var voiceChinese = null;
var voiceThai = null;
var voiceTurkish = null;
var voiceSwedish = null;
var voiceNorwegian = null;
var voiceDanish = null;
var voiceHungarian = null;
var voiceVietnamese = null;
var voiceFinnish = null;

var speechD = new SpeechSynthesisUtterance();
speechD.volume = speechVolume;
speechD.onend = function (event) {
	if (done) {
		setTimeout(doWork, transitionTimer*1000);
	}
};
speechD.lang = 'en-US';

// speech objects to play explanatory text
var s1 = new SpeechSynthesisUtterance(
	"The tones you hear relate to the colors of the object being described."
);
s1.volume = speechVolume;
s1.lang = 'en-US';

var s2 = new SpeechSynthesisUtterance(
	"Low notes are colors at the beginning of the rainbow, like red and orange."
);
s2.volume = speechVolume;
s2.onstart = function (event) {
	playTone(possibleNotes[0], 1, 3, 0);
};
s2.lang = 'en-US';

var s3 = new SpeechSynthesisUtterance(
	"High notes are colors at the end of the rainbow, like blue and purple."
);
s3.volume = speechVolume;
s3.onstart = function (event) {
	playTone(possibleNotes[15], 1, 3, 0);
};
s3.lang = 'en-US';

var s4 = new SpeechSynthesisUtterance(
	"Notes that play sooner represent more of the object's color."
);
s4.volume = speechVolume;
s4.lang = 'en-US';

var s5 = new SpeechSynthesisUtterance(
	"Small sounds are small objects."
);
s5.volume = speechVolume;
s5.onstart = function (event) {
	playTone(possibleNotes[11], 1, 0, 0);
};
s5.lang = 'en-US';

var s6 = new SpeechSynthesisUtterance(
	"Big sounds are big objects."
);
s6.volume = speechVolume;
s6.onstart = function (event) {
	playTone(possibleNotes[11], 1, 5, 0);
};
s6.lang = 'en-US';

var s7 = new SpeechSynthesisUtterance(
	"Louder sounds are brighter colors."
);
s7.volume = speechVolume;
s7.onstart = function (event) {
	playTone(possibleNotes[11], 1, 3, 0);
};
s7.lang = 'en-US';

var s8 = new SpeechSynthesisUtterance(
	"Softer sounds are duller colors."
);
s8.volume = speechVolume;
s8.onstart = function (event) {
	playTone(possibleNotes[11], .2, 3, 0);
};
s8.onend = function (event) {
	setTimeout(doWork, transitionTimer * 1000);
};
s8.lang = 'en-US';

var s9 = new SpeechSynthesisUtterance(
	"For an explanation of the tones, say explain. To hear the previous object again, say replay."
);
s9.onend = function (event) {
	setTimeout(doWork, transitionTimer * 1000);
};
s9.volume = speechVolume;
s9.lang = 'en-US';

// list of impulse responses with which 
// to convolve the tones produced to give 
// the impression of space
//
// (all files from openairlib.net,
//  individually attributed)
var convolveFiles = [
	
	// www.inculture.eu
	// www.progettocresco.com
	"convolution/1_criptadisansebastiano.wav",

	// www.openairlib.net
	// Audiolab, University of York
	// Dr. Damian T. Murphy
	"convolution/2_tyndallbrucemonument.wav",

	// www.inculture.eu
	// www.progettocresco.com
	"convolution/5_castellodegualtieriis.wav",

	// www.openairlib.net
	// Nick Green and Dr Paul Oliver
	"convolution/7_kinoullaisle.wav",

	// www.openairlib.net
	// Audiolab, University of York
	// Damian T. Murphy
	"convolution/8_yorkminster.wav",
	
	// www.openairlib.net
	// Nick Green
	"convolution/9_arbroathabbeysacristy.wav",

];

// list of convolvers using the above buffers
var convolver = [];


// modular arithmetic that handles negatives
function mod(x, y) {
	return (x%y + y)%y;
}


//----------------------------------------//
// SET UP (THESE OCCUR ONCE AT PAGE LOAD) //
//----------------------------------------//

setup();

function setup(){
	loadIRs();
	sizeLabel();

	setTimeout(chooseVoice, (restartTimer * 1000)/3);
};

function chooseVoice() {
	var voices = synthesis.getVoices();
	for (var i = 0; i < voices.length; i++) {
		if (voices[i].name == "Google US English") {
			voiceEnglish.voice = voices[i];
			speechT.voice = voices[i];
			speechD.voice = voices[i];
			s1.voice = voices[i];
			s2.voice = voices[i];
			s3.voice = voices[i];
			s4.voice = voices[i];
			s5.voice = voices[i];
			s6.voice = voices[i];
			s7.voice = voices[i];
			s8.voice = voices[i];
			s9.voice = voices[i];

		// British English
		} else if (voices[i].name == "Google UK English Female") {
			voiceBritishEnglish = new SpeechSynthesisUtterance();
			voiceBritishEnglish.volume = speechVolume;
			voiceBritishEnglish.voice = voices[i];
		// German
		} else if (voices[i].lang == "de-DE") {
			voiceGerman = new SpeechSynthesisUtterance();
			voiceGerman.volume = speechVolume;
			voiceGerman.voice = voices[i];
		
		// Spanish
		} else if (voices[i].lang == "es-ES") {
			voiceSpanish = new SpeechSynthesisUtterance();
			voiceSpanish.volume = speechVolume;
			voiceSpanish.voice = voices[i];
		
		// French
		} else if (voices[i].lang == "fr-FR") {
			voiceFrench = new SpeechSynthesisUtterance();
			voiceFrench.volume = speechVolume;
			voiceFrench.voice = voices[i];
		
		// Italian
		} else if (voices[i].lang == "it-IT") {
			voiceItalian = new SpeechSynthesisUtterance();
			voiceItalian.volume = speechVolume;
			voiceItalian.voice = voices[i];
		
		// Japanese
		} else if (voices[i].lang == "ja-JP") {
			voiceJapanese = new SpeechSynthesisUtterance();
			voiceJapanese.volume = speechVolume;
			voiceJapanese.voice = voices[i];
		
		// Korean
		} else if (voices[i].lang == "ko-KR") {
			voiceKorean = new SpeechSynthesisUtterance();
			voiceKorean.volume = speechVolume;
			voiceKorean.voice = voices[i];
		
		// Dutch
		} else if (voices[i].lang == "nl-NL") {
			voiceDutch = new SpeechSynthesisUtterance();
			voiceDutch.volume = speechVolume;
			voiceDutch.voice = voices[i];
		
		// Polish
		} else if (voices[i].lang == "pl-PL") {
			voicePolish = new SpeechSynthesisUtterance();
			voicePolish.volume = speechVolume;
			voicePolish.voice = voices[i];
		
		// Portuguese
		} else if (voices[i].lang == "pt-BR") {
			voicePortuguese = new SpeechSynthesisUtterance();
			voicePortuguese.volume = speechVolume;
			voicePortuguese.voice = voices[i];
		
		// Russian
		} else if (voices[i].lang == "ru-RU") {
			voiceRussian = new SpeechSynthesisUtterance();
			voiceRussian.volume = speechVolume;
			voiceRussian.voice = voices[i];
		
		// Chinese
		} else if (voices[i].lang == "zh-CN") {
			voiceChinese = new SpeechSynthesisUtterance();
			voiceChinese.volume = speechVolume;
			voiceChinese.voice = voices[i];
		
		// Thai
		} else if (voices[i].lang == "th-TH") {
			voiceThai = new SpeechSynthesisUtterance();
			voiceThai.volume = speechVolume;
			voiceThai.voice = voices[i];
		
		// Turkish
		} else if (voices[i].lang == "tr-TR") {
			voiceTurkish = new SpeechSynthesisUtterance();
			voiceTurkish.volume = speechVolume;
			voiceTurkish.voice = voices[i];
		
		// Vietnamese
		} else if (voices[i].lang == "vi-VN") {
			voiceTurkish = new SpeechSynthesisUtterance();
			voiceTurkish.volume = speechVolume;
			voiceTurkish.voice = voices[i];
		
		// Finnish
		} else if (voices[i].lang == "fi-FI") {
			voiceFinnish = new SpeechSynthesisUtterance();
			voiceFinnish.volume = speechVolume;
			voiceFinnish.voice = voices[i];
		
		// Danish
		} else if (voices[i].lang == "da-DK") {
			voiceDanish = new SpeechSynthesisUtterance();
			voiceDanish.volume = speechVolume;
			voiceDanish.voice = voices[i];
		
		// Hungarian
		} else if (voices[i].lang == "hu-HU") {
			voiceHungarian = new SpeechSynthesisUtterance();
			voiceHungarian.volume = speechVolume;
			voiceHungarian.voice = voices[i];
		
		// Norwegian
		} else if (voices[i].lang == "nb-NO") {
			voiceNorwegian = new SpeechSynthesisUtterance();
			voiceNorwegian.volume = speechVolume;
			voiceNorwegian.voice = voices[i];
		
		// Swedish
		} else if (voices[i].lang == "sv-SE") {
			voiceSwedish = new SpeechSynthesisUtterance();
			voiceSwedish.volume = speechVolume;
			voiceSwedish.voice = voices[i];
		}
	}
}

// loads the impluse response files and 
// produces a list of convolvers
function loadIRs() {
	var i;
	var request;
	for (i = 0; i < convolveFiles.length; i++) {
		request = new XMLHttpRequest();
		request.responseType = "arraybuffer";
		(function() {
			var index = i;
			request.onreadystatechange = function() {
    				if (this.readyState == 4 && this.status == 200) {
					context.decodeAudioData(this.response).then(function(decodedData) {
						convolver[index] = context.createConvolver();
						convolver[index].buffer = decodedData;
						convolver[index].connect(context.destination);
					});
				}
			};
		})();
		request.open('GET', convolveFiles[i], true);
		request.send();
	};
	i = null;
	request = null;
};

// Preparations for visuals
// See https://github.com/mbostock/bost.ocks.org
//     /blob/gh-pages/mike/nations/index.html

// Chart dimensions.
var width = window.innerWidth;
var height = window.innerHeight;

// Create the SVG container and set the origin.
var svg = document.getElementById("canvas");
svg.setAttribute("width", width);
svg.setAttribute("height", height);

// After giving the page time to 
// finish loading impulse response data,
// begin sonifying objects, and double
// check that it's still running every
// thirty seconds
window.setInterval(restart, restartTimer * 1000);


// fixes label and canvas to fit window on resize
window.onresize = function(event){
	sizeLabel();
	width = window.innerWidth;
	height = window.innerHeight;
	svg.setAttribute("width", width);
	svg.setAttribute("height", height);
};

// adjusts the label to fit into one of the nine screens
function sizeLabel() {
	document.getElementById("label").style.width = window.innerWidth/3 + "px";
	document.getElementById("label").style.height = window.innerHeight/3 + "px";
	document.getElementById("label").style.top = window.innerHeight/3 + "px";
	document.getElementById("title").style.height = window.innerHeight/6 + "px";
}


//------------------------------//
// SONIFY and VISUALIZE OBJECTS //
//  (THESE OCCUR EVERY ROUND)   //
//------------------------------//

// checks if it's between 9am and 5pm, and 
// if it is, sonifies and visualizes objects,
// playing a description every fifteenth round
function doWork() {	
	date = new Date();
	done = false;

	stuck = 0;

	if (date.getHours() >= startTime && date.getHours() < endTime) {
		eraseColors();

		// upon request, give description of project
		if (explanation == true) {
			synthesis.speak(s1);
			synthesis.speak(s2);
			synthesis.speak(s3);
			synthesis.speak(s4);
			synthesis.speak(s5);
			synthesis.speak(s6);
			synthesis.speak(s7);
			synthesis.speak(s8);

			explanation = false;
		} else if (replay == true) {
			processData(previous);
			previous = null;
			current = null;
			replay = false;
			counter++;
		// mention explanation
		/*} else if (counter%explanationFrequence == 0) {
			synthesis.speak(s9);
			counter++;*/
		} else {
			getData();
			counter++;
		} 
	}
}

// when phone places an explain request, handle
socket.on('explain request', function() {
	explanation = true;
});

// when phone places a replay request, handle
socket.on('replay request', function() {
	if (previous != null) {
		replay = true;
	};
});

// gets a random object with color and 
// dimension data and visualizes/sonifies
// it 
function getData() {
	var apiURL = HAM.config.apiBaseURL + 
			"/object?apikey=" + HAM.config.apiKey + 
			"&s=random&color=any&size=1&q=dimensions:*&fields=title,people,culture,dated,dimensions,colors,imagepermissionlevel,primaryimageurl";

	var xmlrequest = new XMLHttpRequest();

	xmlrequest.onreadystatechange = function() {
		if (this.readyState == 4) {
			if (this.status == 200) {
				previous = current;
				current = JSON.parse(this.responseText);
				processData(current);
			} else {
				done = true;
			}
		}
	};
			
	xmlrequest.open("GET", apiURL, true);
	xmlrequest.send();

	xmlrequest = null;
	apiURL = null;
}

// takes the given object with color and
// dimension data and visualizes/sonifies
// it
function processData(object) {
	// tell the projector...

	// there is no image
	if (object.records[0].primaryimageurl == null) {
		socket.emit('no image');

	// there is an image, 
	// with no copyright restrictions
	} else if (object.records[0].imagepermissionlevel == 0) {
		socket.emit('new image', object.records[0].primaryimageurl);

	// there is an image, which
	// must be displayed small
	// for copyright reasons
	} else if (object.records[0].imagepermissionlevel == 1) {
		socket.emit('small image', object.records[0].primaryimageurl);

	// an image cannot be displayed
	// for copyright reasons
	} else {
		socket.emit('copyright');
	}

	// produces sun
	blastColors(object.records[0].colors);

	// Sets label information and plays tones
	setLabel(object.records[0]);
	calculateTones(object.records[0].colors, object.records[0].dimensions);

	object = null;
}


//---------------//
// VISUALIZATION //
//---------------//

function moveSun() {
	svg.lastElementChild.style.transform = "translate(" + Math.floor(((Math.random() * 2) - 1) * width/2) + "px, " + -Math.floor(((Math.random() * 2) - 1) * height/2) + "px)";
}

// Creates sun
function blastColors(colors) {
		// creates sun visualization
		var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
		g.setAttribute("data-age", counter);
		g.setAttribute("class", "sun");
		svg.append(g);

		var c = null;
		for (var i = 0; i < colors.length; i++) {
			c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
			c.setAttribute("cx", width/2);
			c.setAttribute("cy", height/2);
			c.setAttribute("r", colors[i].percent*200);
			c.setAttribute("fill", colors[i].color);
			g.append(c);
		}

		// moves sun away from center 
		setTimeout(moveSun, (sonificationLength - 1) * 1000);

		g = null;
		c = null;
}

function removeSun() {
	svg.removeChild(this);
}

// Removes sun after given number of rounds
function eraseColors() {
	var deadAge = counter - threshold;

	var suns = svg.children;
	for (var i = 0; i < suns.length; i++) {
		if (suns[i].getAttribute("data-age") <= deadAge) {
			suns[i].addEventListener("transitionend", removeSun);
			suns[i].style.opacity = 0;
		}
	}
	suns = null;
	i = null;

	deadAge = null;
}

//--------------//
// SONIFICATION //
//--------------//
 
// Plays a tone, given the frequency, volume,
// roomSize, and delay specified
function playTone(frequency, volume, roomSize, delay) {
	var gainValue = 1;
	
	// adjusts volume to suit convolver
	switch (roomSize) {
		case 0:
			gainValue = .6;
			break;
		case 1:
			gainValue = .9;
			break;
		case 3:
			gainValue = .4;
			break;
		case 4:
			gainValue = .4;
			break;
		case 5:
			gainValue = .3;
			break;
		default:
			gainValue = 1;
			break;
	}

	// adjusts volume of higher pitches
	gainValue *= (50 - Math.sqrt(frequency))/50;

	gainValue *= volume;

	// set up tone
	var osc = context.createOscillator();
	osc.frequency.value = frequency;
	
	var gain = context.createGain();
	gain.gain.value = gainValue;

	osc.connect(gain);
	gain.connect(convolver[roomSize]);

	// play tone
	osc.start(context.currentTime + delay);
	osc.stop(context.currentTime + delay + Math.round(frequency*.2)/frequency);

	osc = null;
	gain = null;
	gainValue = null;
	roomSize = null;
	frequency = null;
	volume = null;
	delay = null;
}

// gets the relative size, on a scale of 0-5,
// based on the dimensions given
function getSize(dimensions) {
	var size = 0;
	if (dimensions) {
		// get first number in dimensions
		var dArray = dimensions.split(" ");
		var i = dArray.findIndex(Number);
		var d1 = dArray[i];
		dArray = dArray.slice(i + 1);

		// get second number, if one exists
		i = dArray.findIndex(Number);
		if (i != -1) {
			var d2 = dArray[i];
		} else {
			var d2 = 1;
		}

		// cap size 
		if (d1 > dimensionCap) {
			d1 = dimensionCap;
		}
		if (d2 > dimensionCap) {
			d2 = dimensionCap;
		}

		// use logarithmic scale
		if ((d1 > 0) && (d2 > 0)) {
			size = Math.round((convolver.length - 1)*Math.log(Math.sqrt(d1*d2))/Math.log(cap));
		}

		if (size < 0) {
			size = 0;
		} else if (size > (convolver.length - 1)) {
			size = (convolver.length - 1);
		}
		
		dArray = null;
		i = null;
		d1 = null;
		d2 = null;
	}

	dimensions = null;

	return size;
}

function restart() {
	if ((synthesis.speaking == false) && (done == true)) {
		doWork();
	} else if (stuck < 3) {
		stuck++;
	} else {
		doWork();
	}
}

function proceed() {
	if (synthesis.speaking == false) {
		doWork();
	} else {
		done = true;
	}
}

// determines what tones to play for
// a given object and plays them
function calculateTones(colors, dimensions) {
	var size = getSize(dimensions);
	colors.forEach(function(c, _) {
		// get RGB data from hex color
		var r = parseInt(c.color.substring(1, 3), 16)/255;
		var g = parseInt(c.color.substring(3, 5), 16)/255;
		var b = parseInt(c.color.substring(5, 7), 16)/255;

		// calculate hue and saturation
		var max = Math.max(r, g, b);
		var min = Math.min(r, g, b);

		var hue = 0;
		var saturation = 0;
		var range = max - min;

		if (max != min) {
			switch(max) {
				case r: 
					hue = mod(((g - b)/range), 6);
					break;
				case g: 
					hue = (b - r)/range + 2;
					break;
				case b:
					hue = (r - g)/range + 4;
					break;
				default:
			}
			hue = Math.round((15*hue)/6);
		}

		if (max != 0) {
			saturation = .3 + (range/max)*.7;
		}

		// play tone based on object data
		playTone(possibleNotes[hue], saturation, 
				size, (1 - c.percent)*(4*sonificationLength/5));
	});
	setTimeout(proceed, sonificationLength * 1000);
	size = null;
	colors = null;
	dimensions = null;
}


//-------//
// LABEL //
//-------//

// sets the label and reads it
function setLabel(item) {
	// title
	if (item.title != null) {
		var text = item.title;
		document.getElementById("title").innerHTML = text;

		if (/[0-9]-[0-9]/.test(text)) {
			text = text.replace("-", " to ");
		}

		if (/No\.\s*[0-9]/.test(text)) {
			text = text.replace("No.", "number");
		}

		text = text.replace(/'-/g, "'");

		speechT.text = text;
		synthesis.speak(speechT);
	}

	// artist name(s)
	document.getElementById("artist").innerHTML = "";

	var artists = 0;
	if (item.people != null) {
		var text = "";

		// get name(s) of artists, separated by
		// ", and "
		var i;
		for (i = 0; i < item.people.length; i++) {
			if (item.people[i].role == "Artist") {
				if (artists == 0) {
					text += item.people[i].name;
					
					artists = 1;
				} else {
					text += ", and " + item.people[i].name;
				}
			}
		}

		// sets HTML and reads
		document.getElementById("artist").innerHTML = text;
		if (/[0-9]-[0-9]/.test(text)) {
			text = text.replace("-", " to ");
		}

		if (text.includes("Anonymous") || text.includes("Unidentified")) {
			voiceEnglish.text = text;
			synthesis.speak(voiceEnglish);
		} else {
			handleLanguage(item.culture, text);
		}
		text = null;
	} else if (item.culture != null) {
		document.getElementById("artist").innerHTML = item.culture;
		voiceEnglish.text = item.culture;
		synthesis.speak(voiceEnglish);
	}
	artists = null;

	// date
	document.getElementById("date").innerHTML = "";

	if (item.dated != null) {
		var text = item.dated;
		document.getElementById("date").innerHTML = text;
		
		text = text.replace("-", " to ");

		// handles pronunciation of circa
		if (text.includes("c")) {
			text = text.replace(/ca?\./g, "circa");
		}
		// handles pronunciation of decades
		if (decadePattern.test(text)) {
			text = text.replace(/s/g, "");
			text = text.replace(/19/g, " nineteen ");
			text = text.replace(/18/g, " eighteen ");
			text = text.replace(/17/g, " seventeen ");
			text = text.replace(/16/g, " sixteen ");
			text = text.replace(/15/g, " fifteen ");
			text = text.replace(/14/g, " fourteen ");
			text = text.replace(/00/g, " hundreds ");
			text = text.replace(/10/g, " teens ");
			text = text.replace(/20/g, " twenties ");
			text = text.replace(/30/g, " thirties ");
			text = text.replace(/40/g, " forties ");
			text = text.replace(/50/g, " fifties ");
			text = text.replace(/60/g, " sixties ");
			text = text.replace(/70/g, " seventies ");
			text = text.replace(/80/g, " eighties ");
			text = text.replace(/90/g, " nineties ");
		}
		speechD.text = text;
		text = null;
	} else {
		speechD.text = " ";
	}
	synthesis.speak(speechD);
	
	// resize title to fit
	var titleBoxWidth = parseInt(document.getElementById("label").style.width.slice(0, -2));
	var normalTitleWidth = titleBoxWidth/20/.8;

	if (item.title.length > 50) {
		document.getElementById("title").style.fontSize = 2*titleBoxWidth/item.title.length/.8 + "px";
	} else if (item.title.length > 20) {
		document.getElementById("title").style.fontSize = titleBoxWidth/item.title.length/.8 + "px";
	} else {
		document.getElementById("title").style.fontSize =  normalTitleWidth + "px";
	}

	titleBoxWidth = null;
	normalTitleWidth = null;
	item = null;
}

function speakLanguage(voice, text) {
	if (voice != null) {
		voice.text = text;
		synthesis.speak(voice);
	} else {
		voiceEnglish.text = text;
		synthesis.speak(voiceEnglish);
	}
}

function handleLanguage(culture, text) {
	switch(culture) {
		case "American":
		case "Canadian":
			voiceEnglish.text = text;
			synthesis.speak(voiceEnglish);
			break;
		case "British":
		case "English":
		case "Irish":
		case "Scottish":
			speakLanguage(voiceBritishEnglish, text);
			break;
		case "German":
		case "Austrian":
			speakLanguage(voiceGerman, text);
			break;
		case "French":
			speakLanguage(voiceFrench, text);
			break;
		case "Italian":
		case "Venetian":
		case "Tuscan":
		case "Florentine":
		case "Nepalese":
		case "Bolognese":
		case "Neapolitan":
			speakLanguage(voiceItalian, text);
			break;
		case "Greek":
		case "Roman":
			break;
		case "Japanese":
			speakLanguage(voiceJapanese, text);
			break;
		case "Chinese":
			speakLanguage(voiceChinese, text);
			break;
		case "Dutch":
		case "Flemish":
		case "Netherlandish":
			speakLanguage(voiceDutch, text);
			break;
		case "Korean":
			speakLanguage(voiceKorean, text);
			break;
		case "Spanish":
		case "Mexican":
		case "Argentinian":
		case "Chilean":
		case "Cuban":
		case "Peruvian":
		case "Colombian":
		case "Venezuelan":
		case "Uruguayan":
		case "Guatemalan":
			speakLanguage(voiceSpanish, text);
			break;
		case "Russian":
			speakLanguage(voiceRussian, text);
			break;
		case "Thai":
			speakLanguage(voiceThai, text);
			break;
		case "Swedish":
			speakLanguage(voiceSwedish, text);
			break;
		case "Turkish":
			speakLanguage(voiceTurkish, text);
			break;
		case "Norwegian":
			speakLanguage(voiceNorwegian, text);
			break;
		case "Portuguese":
		case "Brazilian":
			speakLanguage(voicePortuguese, text);
			break;
		case "Danish":
			speakLanguage(voiceDanish, text);
			break;
		case "Polish":
			speakLanguage(voicePolish, text);
			break;
		case "Hungarian":
			speakLanguage(voiceHungarian, text);
			break;
		case "Indonesian":
			speakLanguage(voiceIndonesian, text);
			break;
		case "Vietnamese":
			speakLanguage(voiceVietnamese, text);
			break;
		case "Finnish":
			speakLanguage(voiceFinnish, text);
			break;
		default:
			voiceEnglish.text = text;
			synthesis.speak(voiceEnglish);
			break;
	}
}
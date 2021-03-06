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
//    peculiar ways, etc.--to account for some of
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
var current = null; // current object
var explanation = false; // explanation requested
var commentRequest = false;
var comments = [];
var done = true;
var stuck = 0;
var restartTimer = 30;
var transitionTimer = 2;
var sonificationLength = 15;
var speechVolume = .3;
var startTime = 9;
var endTime = 17;
var reloadTime = 8;
var reload = false;
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

var voiceDictionary = {};

var speechD = new SpeechSynthesisUtterance();
speechD.volume = speechVolume;
speechD.onend = function (event) {
	if (done) {
		setTimeout(doWork, transitionTimer*1000);
	}
};
speechD.lang = 'en-US';


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


var exampleNote = possibleNotes[Math.ceil(possibleNotes.length/2)];
var exampleRoom = Math.ceil(convolveFiles.length/2);

var explanationSpeech = [];

// speech objects to play explanatory text
var s = new SpeechSynthesisUtterance(
	"The tones you hear relate to the colors of the object being described."
);
s.volume = speechVolume;
s.lang = 'en-US';
explanationSpeech.push(s);

s = new SpeechSynthesisUtterance(
	"Low notes are colors at the beginning of the rainbow, like red and orange."
);
s.volume = speechVolume;
s.onstart = function (event) {
	playTone(possibleNotes[0], 1, exampleRoom, 0);
};
s.lang = 'en-US';
explanationSpeech.push(s);

s = new SpeechSynthesisUtterance(
	"High notes are colors at the end of the rainbow, like blue and purple."
);
s.volume = speechVolume;
s.onstart = function (event) {
	playTone(possibleNotes[possibleNotes.length - 1], 1, exampleRoom, 0);
};
s.lang = 'en-US';
explanationSpeech.push(s);

s = new SpeechSynthesisUtterance(
	"Notes that play sooner represent more of the object's color."
);
s.volume = speechVolume;
s.lang = 'en-US';
explanationSpeech.push(s);

s = new SpeechSynthesisUtterance(
	"Small sounds are small objects."
);
s.volume = speechVolume;
s.onstart = function (event) {
	playTone(exampleNote, 1, 0, 0);
};
s.lang = 'en-US';
explanationSpeech.push(s);

s = new SpeechSynthesisUtterance(
	"Big sounds are big objects."
);
s.volume = speechVolume;
s.onstart = function (event) {
	playTone(exampleNote,  1, 5, 0);
};
s.lang = 'en-US';
explanationSpeech.push(s);

s = new SpeechSynthesisUtterance(
	"Louder sounds are brighter colors."
);
s.volume = speechVolume;
s.onstart = function (event) {
	playTone(exampleNote, 1, exampleRoom, 0);
};
s.lang = 'en-US';
explanationSpeech.push(s);

s = new SpeechSynthesisUtterance(
	"Softer sounds are duller colors."
);
s.volume = speechVolume;
s.onstart = function (event) {
	playTone(exampleNote, .2, exampleRoom, 0);
};
s.onend = function (event) {
	socket.emit('close message');
	setTimeout(doWork, transitionTimer * 1000);
};
s.lang = 'en-US';
explanationSpeech.push(s);

s = new SpeechSynthesisUtterance(
	"To use the voice controls, speak into the microphone on the stand in front of you. For an explanation of the tones, say explain. To hear a selection of comments from your fellow visitors, say comments."
);
s.onend = function (event) {
	setTimeout(doWork, transitionTimer * 1000);
};
s.volume = speechVolume;
s.lang = 'en-US';

var c = new SpeechSynthesisUtterance(
	"If you'd like to leave a comment, speak into the microphone on the stand in front of you after the tone."
);
c.onend = function (event) {
	socket.emit('commenting');
	playTone(exampleNote, 1, 1, 0);
};
c.volume = speechVolume;
c.lang = 'en-US';

var commentReaders = [];

for (var i = 0; i < 5; i++) {
	commentReaders.push(new SpeechSynthesisUtterance());
	commentReaders[i].volume = speechVolume;
	commentReaders[i].lang = 'en-US';
}

commentReaders[4].onend = function (event) {
	setTimeout(doWork, transitionTimer * 1000);
};


// modular arithmetic that handles negatives
function mod(x, y) {
	return (x%y + y)%y;
}


//----------------------------------------//
// SET UP (THESE OCCUR ONCE AT PAGE LOAD) //
//----------------------------------------//

setup();

function setup(){
	var id = /\?id=([0-9]{4})/i.exec(window.location.search);
	if (id) {
		socket.emit("id", id[1]);
		reload = true;
	} else {
		socket.emit("id");
	}

	window.onbeforeunload = function() {
		socket.disconnect(true);
	};

	loadIRs();
	sizeLabel();

	setTimeout(chooseVoice, (restartTimer * 1000)/3);
};

function chooseVoice() {
	var voices = synthesis.getVoices();
	var voice;
	for (var i = 0; i < voices.length; i++) {
		voice = new SpeechSynthesisUtterance();
		voice.voice = voice[i];
		voice.volume = speechVolume;
		voiceDictionary[voices[i].lang] = voice;

		if (voices[i].name == "Google US English") {
			speechT.voice = voices[i];
			speechT.volume = speechVolume;
			speechD.voice = voices[i];
			speechD.volume = speechVolume;
			for (var j = 0; j < explanationSpeech.length; j++) {
				explanationSpeech[j].voice = voices[i];
				explanationSpeech[j].volume = speechVolume;
			}
			for (var j = 0; j < commentReaders.length; j++) {
				commentReaders[j].voice = voices[i];
				commentReaders[j].volume = speechVolume;
			}
			s.voice = voices[i];
			s.volume = speechVolume;
			c.voice = voices[i];
			c.volume = speechVolume;
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
		synthesis.cancel();

		// upon request, give description of project
		if (explanation == true) {
			explanation = false;

			socket.emit('message', 'The tones you hear relate to the colors of the object being described.<br /><br /><br /><br />Low notes are colors at the beginning of the rainbow, like <font color="red">red</font> and <font color="orange">orange</font>.<br /><br />High notes are colors at the end of the rainbow, like <font color="blue">blue</font> and <font color="purple">purple</font>.<br /><br /><br /><br />Notes that play sooner represent more of the object\'s color.<br /><br /><br /><br /><span style="font-size: 80%">Small sounds are small objects.</span><br /><br /><span style="font-size: 120%">Big sounds are big objects.</span><br /><br /><br /><br /><font color="#00b300">Louder sounds are brighter colors.</font><br /><br /><font color="#3e743e">Softer sounds are duller colors.</font>');

			for (var i = 0; i < explanationSpeech.length; i++) {
				synthesis.speak(explanationSpeech[i]);
			}

		// upon request, read selection of comments
		} else if (commentRequest == true) {
			commentRequest = false;
			readComments();

		// mention explanation
		} else if (counter%explanationFrequence == 0) {
			synthesis.speak(s);
			counter++;

		// solicit comment
		} else if (counter%explanationFrequence == Math.floor(explanationFrequence/2)) {
			synthesis.speak(c);
			counter++;
		} else {
			getData();
			counter++;
		} 
	} else if (date.getHours() == reloadTime && counter != 0 && reload) {
		socket.emit('reloading');
		location.reload(true);
	}
}

socket.on('explain request', function() {
	explanation = true;
});

socket.on('comment request', function(commentSample) {
	commentRequest = true;
	comments = commentSample;
});

socket.on('comment end', function() {
	playTone(exampleNote, 1, 1, 0);
	setTimeout(doWork, transitionTimer * 1000);
});

socket.on('id', function(id) {
	alert("ID: " + id);
});

socket.on('id collision', function(id) {
	alert("ID already in use. " + id + " used instead.");
});

function readComments() {
	if (comments) {
		for (var i = 0; i < 5; i++) {
			commentReaders[i].text = comments[i];
			synthesis.speak(commentReaders[i]);
		}
	} else {
		doWork();
	}
}

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
			size = Math.round((convolver.length - 1)*Math.log(Math.sqrt(d1*d2))/Math.log(dimensionCap));
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
		socket.emit('close message');
		doWork();
	} else if (stuck < 6) {
		stuck++;
	} else {
		socket.emit('close message');
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
			voiceDictionary["en-US"].text = text;
			synthesis.speak(voiceDictionary["en-US"]);
		} else {
			handleLanguage(item.culture, text);
		}
		text = null;
	} else if (item.culture != null) {
		document.getElementById("artist").innerHTML = item.culture;
		voiceDictionary["en-US"].text = item.culture;
		synthesis.speak(voiceDictionary["en-US"]);
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
	var lang;
	switch(culture) {
		case "American":
		case "Canadian":
			lang = "en-US";
			break;
		case "British":
		case "English":
		case "Irish":
		case "Scottish":
			lang = "en-UK";
			break;
		case "German":
		case "Austrian":
			lang = "de-DE";
			break;
		case "French":
			lang = "fr-FR";
			break;
		case "Italian":
		case "Venetian":
		case "Tuscan":
		case "Florentine":
		case "Nepalese":
		case "Bolognese":
		case "Neapolitan":
			lang = "it-IT";
			break;
		case "Japanese":
			lang = "ja-JP";
			break;
		case "Chinese":
			lang = "zh-CN";
			break;
		case "Dutch":
		case "Flemish":
		case "Netherlandish":
			lang = "nl-NL";
			break;
		case "Korean":
			lang = "ko-KR";
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
			lang = "es-ES";
			break;
		case "Russian":
			lang = "ru-RU";
			break;
		case "Thai":
			lang = "th-TH";
			break;
		case "Swedish":
			lang = "sv-SE";
			break;
		case "Turkish":
			lang = "tr-TR";
			break;
		case "Norwegian":
			lang = "nb-NO";
			break;
		case "Portuguese":
		case "Brazilian":
			lang = "pt-BR";
			break;
		case "Danish":
			lang = "da-DK";
			break;
		case "Polish":
			lang = "pl-PL";
			break;
		case "Hungarian":
			lang = "hu-HU";
			break;
		case "Vietnamese":
			lang = "vi-VN";
			break;
		case "Finnish":
			lang = "fi-FI";
			break;
		case "Greek":
		case "Roman":
		default:
			lang = "en-US";
			break;
	}
	(voiceDictionary[lang] || voiceDictionary["en-US"]).text = text;
	synthesis.speak(voiceDictionary[lang] || voiceDictionary["en-US"]);
	lang = null;
}
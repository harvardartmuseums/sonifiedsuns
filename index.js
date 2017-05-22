'use strict';

const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');

const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;

app.get('/projectors.html', function(req, res){
	res.sendFile(path.join(__dirname, '/projectors.html'));
});

app.get('/screens.html', function(req, res){
	res.sendFile(path.join(__dirname, '/screens.html'));
});

app.get('/control.html', function(req, res){
	res.sendFile(path.join(__dirname, '/control.html'));
});

app.get('/screens.js', function(req, res){
	res.sendFile(path.join(__dirname, '/screens.js'));
});

app.get('/convolution/1_criptadisansebastiano.wav', function(req, res){
	res.sendFile(path.join(__dirname, '/convolution/1_criptadisansebastiano.wav'));
});

app.get('/convolution/2_tyndallbrucemonument.wav', function(req, res){
	res.sendFile(path.join(__dirname, '/convolution/2_tyndallbrucemonument.wav'));
});

app.get('/convolution/3_falklandpalacebottledungeon.wav', function(req, res){
	res.sendFile(path.join(__dirname, '/convolution/3_falklandpalacebottledungeon.wav'));
});

app.get('/convolution/4_centralhalluniversityofyork.wav', function(req, res){
	res.sendFile(path.join(__dirname, '/convolution/4_centralhalluniversityofyork.wav'));
});

app.get('/convolution/5_castellodegualtieriis.wav', function(req, res){
	res.sendFile(path.join(__dirname, '/convolution/5_castellodegualtieriis.wav'));
});

app.get('/convolution/6_stmargaretschurch.wav', function(req, res){
	res.sendFile(path.join(__dirname, '/convolution/6_stmargaretschurch.wav'));
});

app.get('/convolution/7_kinoullaisle.wav', function(req, res){
	res.sendFile(path.join(__dirname, '/convolution/7_kinoullaisle.wav'));
});

app.get('/convolution/8_yorkminster.wav', function(req, res){
	res.sendFile(path.join(__dirname, '/convolution/8_yorkminster.wav'));
});

app.get('/convolution/9_arbroathabbeysacristy.wav', function(req, res){
	res.sendFile(path.join(__dirname, '/convolution/9_arbroathabbeysacristy.wav'));
});

app.get('/js/config.js', function(req, res){
	res.sendFile(path.join(__dirname, '/js/config.js'));
});

server.listen(PORT);



var transp = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	port: 587,
	secure: false,
	auth: {
		user: 'levyhaskell@g.harvard.edu',
		pass: 'a47!E3bU7n'
	}
});



var screensIO = io.of('/screens-namespace');
var projectorIO = io.of('/projectors-namespace');
var controlIO = io.of('/control-namespace');
var trios = [];
var timeElapsed = 0;

setInterval(testConnection, 10000);

function testConnection() {
	if (timeElapsed >= 6) {
		var trio = trios[trios.length - 1];
		if (!trio.complete) {
			screensIO.to(trio.screen).emit('timed out');
			projectorIO.to(trio.projector).emit('timed out');
			controlIO.to(trio.control).emit('timed out');
			trios.pop();
		}
		timeElapsed = 0;
	} else if (timeElapsed != 0) {
		timeElapsed++;
	}
}

function refuseScreens() {
	screensIO.to(this).emit('too many sockets');
}

screensIO.on('connection', function(socket) {
	if (trios.length == 0 || trios[trios.length - 1].complete) {
		trios.push({screen: socket.id, projector: undefined, control: undefined, complete: false, id: (socket.id + "room")});
		timeElapsed = 1;
	} else if (trios[trios.length - 1].screen != undefined) {
		setTimeout(refuseScreens.bind(socket.id), 20);
		return;
	} else {
		var trio = trios[trios.length - 1];
		trio.screen = socket.id;
		if (trio.projector != undefined && trio.control != undefined) {
			trio.complete = true;
		}
	}
	
	var id = trios[trios.length - 1].id;
	socket.join(id);

	socket.on('new image', function(url) {
		projectorIO.to(this).emit('new image', url);
	}.bind(id));
	socket.on('small image', function(url) {
		projectorIO.to(this).emit('small image', url);
	}.bind(id));
	socket.on('copyright', function() {
		projectorIO.to(this).emit('copyright');
	}.bind(id));
	socket.on('no image', function() {
		projectorIO.to(this).emit('no image');
	}.bind(id));
	socket.on('commenting', function() {
		controlIO.to(this).emit('commenting');
	}.bind(id));
	socket.on('message', function(text) {
		controlIO.to(this).emit('message', text);
	}.bind(id));
	socket.on('close message', function() {
		controlIO.to(this).emit('close message');
	}.bind(id));
});

function refuseProjector() {
	projectorIO.to(this).emit('too many sockets');
}

projectorIO.on('connection', function(socket) {
	if (trios.length == 0 || trios[trios.length - 1].complete) {
		trios.push({screen: undefined, projector: socket.id, control: undefined, complete: false, id: (socket.id + "room")});
		timeElapsed = 1;
	} else if (trios[trios.length - 1].projector != undefined) {
		setTimeout(refuseProjector.bind(socket.id), 20);
		return;
	} else {
		var trio = trios[trios.length - 1];
		trio.projector = socket.id;
		if (trio.screen != undefined && trio.control != undefined) {
			trio.complete = true;
		}
	}

	socket.on('comment request', function(comments) {
		screensIO.to(this).emit('comment request', comments);
	}.bind(id));

	var id = trios[trios.length - 1].id;
	socket.join(id);
});

function refuseControl() {
	controlIO.to(this).emit('too many sockets');
}

controlIO.on('connection', function(socket) {
	if (trios.length == 0 || trios[trios.length - 1].complete) {
		trios.push({screen: undefined, projector: undefined, control: socket.id, complete: false, id: (socket.id + "room")});
		timeElapsed = 1;
	} else if (trios[trios.length - 1].control != undefined) {
		setTimeout(refuseControl.bind(socket.id), 20);
		return;
	} else {
		var trio = trios[trios.length - 1];
		trio.control = socket.id;
		if (trio.projector != undefined && trio.screen != undefined) {
			trio.complete = true;
		}
	}

	var id = trios[trios.length - 1].id;
	socket.join(id);

	socket.on('explain request', function() {
		screensIO.to(this).emit('explain request');
	}.bind(pair));
	socket.on('comment request', function() {
		projectorIO.to(this).emit('comment request');
	}.bind(pair));
	socket.on('comment end', function(comments) {
		screensIO.to(this).emit('comment end');
		projectorIO.to(this).emit('new comments', comments);
	}.bind(pair));
	socket.on('email', function(text) {
		transp.sendMail({
			from: 'levyhaskell@g.harvard.edu',
			to: 'levyhaskell@g.harvard.edu',
			subject: 'New Suns Explorer Comment',
			text: text,
			html: text
		});
	});
});
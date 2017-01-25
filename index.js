'use strict';

const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');

const PORT = process.env.PORT || 3000;

app.get('/projectors.html', function(req, res){
	res.sendFile(path.join(__dirname, '/projectors.html'));
});

app.get('/screens.html', function(req, res){
	res.sendFile(path.join(__dirname, '/screens.html'));
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


var screensIO = io.of('/screens-namespace');
var projectorIO = io.of('/projectors-namespace');
var pairs = [];
var unconnectedScreen = 0;
var unconnectedProjector = 0;

setInterval(testConnection, 10000);

function testConnection() {
	if (unconnectedScreen == 6) {
		screensIO.to(pairs.pop()).emit('timed out');
		unconnectedScreen = 0;
	} else if (unconnectedProjector == 6) {
		projectorIO.to(pairs.pop()).emit('timed out');
		unconnectedProjector = 0;
	} else if (unconnectedScreen) {
		unconnectedScreen++;
	} else if (unconnectedProjector) {
		unconnectedProjector++;
	}
}

screensIO.on('connection', function(socket) {
	if (unconnectedScreen) {
		socket.to(socket.id).emit('too many sockets');
	} else { 
		if (unconnectedProjector) {
			unconnectedProjector = 0;
		} else {
			unconnectedScreen = 1;
			pairs.push(socket.id + "room");
		}
		var pair = pairs[pairs.length - 1];
		socket.join(pair);

		socket.on('new image', function(url) {
			projectorIO.to(this).emit('new image', url);
		}.bind(pair));
		socket.on('small image', function(url) {
			projectorIO.to(this).emit('small image', url);
		}.bind(pair));
		socket.on('copyright', function() {
			projectorIO.to(this).emit('copyright');
		}.bind(pair));
		socket.on('no image', function() {
			projectorIO.to(this).emit('no image');
		}.bind(pair));
	} 
});


projectorIO.on('connection', function(socket) {
	if (unconnectedProjector) {
		socket.to(socket.id).emit('too many sockets');
	} else {
		if (unconnectedScreen) {
			unconnectedScreen = 0;
		} else {
			unconnectedProjector = 1;
			pairs.push(socket.id + "room");
		}
		var pair = pairs[pairs.length - 1];
		socket.join(pair);

		socket.on('explain request', function() {
			screensIO.to(this).emit('explain request');
		}.bind(pair));

		socket.on('replay request', function() {
			screensIO.to(this).emit('replay request');
		}.bind(pair));
	}
});
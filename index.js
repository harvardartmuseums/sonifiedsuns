var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var image = null;

app.get('/projectors.html', function(req, res){
	res.sendFile(__dirname + '/projectors.html');
});

app.get('/screens.html', function(req, res){
	res.sendFile(__dirname + '/screens.html');
});

app.get('/screens.js', function(req, res){
	res.sendFile(__dirname + '/screens.js');
});

app.get('/convolution/1_criptadisansebastiano.wav', function(req, res){
	res.sendFile(__dirname + '/convolution/1_criptadisansebastiano.wav');
});

app.get('/convolution/2_tyndallbrucemonument.wav', function(req, res){
	res.sendFile(__dirname + '/convolution/2_tyndallbrucemonument.wav');
});

app.get('/convolution/3_falklandpalacebottledungeon.wav', function(req, res){
	res.sendFile(__dirname + '/convolution/3_falklandpalacebottledungeon.wav');
});

app.get('/convolution/4_centralhalluniversityofyork.wav', function(req, res){
	res.sendFile(__dirname + '/convolution/4_centralhalluniversityofyork.wav');
});

app.get('/convolution/5_castellodegualtieriis.wav', function(req, res){
	res.sendFile(__dirname + '/convolution/5_castellodegualtieriis.wav');
});

app.get('/convolution/6_stmargaretschurch.wav', function(req, res){
	res.sendFile(__dirname + '/convolution/6_stmargaretschurch.wav');
});

app.get('/convolution/7_kinoullaisle.wav', function(req, res){
	res.sendFile(__dirname + '/convolution/7_kinoullaisle.wav');
});

app.get('/convolution/8_yorkminster.wav', function(req, res){
	res.sendFile(__dirname + '/convolution/8_yorkminster.wav');
});

app.get('/convolution/9_arbroathabbeysacristy.wav', function(req, res){
	res.sendFile(__dirname + '/convolution/9_arbroathabbeysacristy.wav');
});

app.get('/js/config.js', function(req, res){
	res.sendFile(__dirname + '/js/config.js');
});

var screensIO = io.of('/screens-namespace');
var projectorIO = io.of('/projectors-namespace');

screensIO.on('connection', function(socket) {
	socket.on('new image', function(url) {
		projectorIO.emit('new image', url);
		image = url;
	});
	socket.on('small image', function(url) {
		projectorIO.emit('small image', url);
		image = null;
	});
	socket.on('copyright', function() {
		projectorIO.emit('copyright');
		image = null;
	});
	socket.on('no image', function() {
		projectorIO.emit('no image');
		image = null;
	});
});


projectorIO.on('connection', function(socket) {
	socket.on('explain request', function() {
		screensIO.emit('explain request');
	});
	socket.on('replay request', function() {
		screensIO.emit('replay request');
	});
});

http.listen(3000, function(){
});
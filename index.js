"use strict";

const app = require('express')();
const socketIO = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;

const server = app();

const io = socketIO(server);

var image = null;

server.use('projectors.html', function(req, res){
	res.sendFile(path.join(__dirname, 'projectors.html'));
});

server.use('screens.html', function(req, res){
	res.sendFile(path.join(__dirname, 'screens.html'));
});

server.use('screens.js', function(req, res){
	res.sendFile(path.join(__dirname, 'screens.js'));
});

server.use('convolution/1_criptadisansebastiano.wav', function(req, res){
	res.sendFile(path.join(__dirname, 'convolution/1_criptadisansebastiano.wav'));
});

server.use('convolution/2_tyndallbrucemonument.wav', function(req, res){
	res.sendFile(path.join(__dirname, 'convolution/2_tyndallbrucemonument.wav'));
});

server.use('convolution/3_falklandpalacebottledungeon.wav', function(req, res){
	res.sendFile(path.join(__dirname, 'convolution/3_falklandpalacebottledungeon.wav'));
});

server.use('convolution/4_centralhalluniversityofyork.wav', function(req, res){
	res.sendFile(path.join(__dirname, 'convolution/4_centralhalluniversityofyork.wav'));
});

server.use('convolution/5_castellodegualtieriis.wav', function(req, res){
	res.sendFile(path.join(__dirname, 'convolution/5_castellodegualtieriis.wav'));
});

server.use('convolution/6_stmargaretschurch.wav', function(req, res){
	res.sendFile(path.join(__dirname, 'convolution/6_stmargaretschurch.wav'));
});

server.use('convolution/7_kinoullaisle.wav', function(req, res){
	res.sendFile(path.join(__dirname, 'convolution/7_kinoullaisle.wav'));
});

server.use('convolution/8_yorkminster.wav', function(req, res){
	res.sendFile(path.join(__dirname, 'convolution/8_yorkminster.wav'));
});

server.use('convolution/9_arbroathabbeysacristy.wav', function(req, res){
	res.sendFile(path.join(__dirname, 'convolution/9_arbroathabbeysacristy.wav'));
});

server.use('js/config.js', function(req, res){
	res.sendFile(path.join(__dirname, 'js/config.js'));
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

server.listen(PORT, () => console.log('Listening on ${ PORT }'));
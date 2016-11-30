'use strict';

const app = require('express')();
const io = require('socket.io');
const path = require('path');

const PORT = process.env.PORT || 3000;

const server = app()
	.use('projectors.html', function(req, res){
		res.sendFile(path.join(__dirname, 'projectors.html'));
	})

	.use('screens.html', function(req, res){
		res.sendFile(path.join(__dirname, 'screens.html'));
	})

	.use('screens.js', function(req, res){
		res.sendFile(path.join(__dirname, 'screens.js'));
	})

	.use('convolution/1_criptadisansebastiano.wav', function(req, res){
		res.sendFile(path.join(__dirname, 'convolution/1_criptadisansebastiano.wav'));
	})

	.use('convolution/2_tyndallbrucemonument.wav', function(req, res){
		res.sendFile(path.join(__dirname, 'convolution/2_tyndallbrucemonument.wav'));
	})

	.use('convolution/3_falklandpalacebottledungeon.wav', function(req, res){
		res.sendFile(path.join(__dirname, 'convolution/3_falklandpalacebottledungeon.wav'));
	})

	.use('convolution/4_centralhalluniversityofyork.wav', function(req, res){
		res.sendFile(path.join(__dirname, 'convolution/4_centralhalluniversityofyork.wav'));
	})

	.use('convolution/5_castellodegualtieriis.wav', function(req, res){
		res.sendFile(path.join(__dirname, 'convolution/5_castellodegualtieriis.wav'));
	})

	.use('convolution/6_stmargaretschurch.wav', function(req, res){
		res.sendFile(path.join(__dirname, 'convolution/6_stmargaretschurch.wav'));
	})

	.use('convolution/7_kinoullaisle.wav', function(req, res){
		res.sendFile(path.join(__dirname, 'convolution/7_kinoullaisle.wav'));
	})

	.use('convolution/8_yorkminster.wav', function(req, res){
		res.sendFile(path.join(__dirname, 'convolution/8_yorkminster.wav'));
	})

	.use('convolution/9_arbroathabbeysacristy.wav', function(req, res){
		res.sendFile(path.join(__dirname, 'convolution/9_arbroathabbeysacristy.wav'));
	})

	.use('js/config.js', function(req, res){
		res.sendFile(path.join(__dirname, 'js/config.js'));
	})

	.listen(PORT, () => console.log('Listening on ${ PORT }'));


var screensIO = io.of('/screens-namespace');
var projectorIO = io.of('/projectors-namespace');

screensIO.on('connection', function(socket) {
	socket.on('new image', function(url) {
		projectorIO.emit('new image', url);
	});
	socket.on('small image', function(url) {
		projectorIO.emit('small image', url);
	});
	socket.on('copyright', function() {
		projectorIO.emit('copyright');
	});
	socket.on('no image', function() {
		projectorIO.emit('no image');
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
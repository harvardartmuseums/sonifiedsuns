'use strict';

const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const path = require('path');

//const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;

app.get('/projectors.html', function(req, res){
	res.sendFile(path.join(__dirname, '/projectors.html'));
});

app.get('/screens.html', function(req, res){
	res.sendFile(path.join(__dirname, '/screens.html'));
});

app.get('/control.html', function(req, res) {
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



//var transp = nodemailer.createTransport({
//	host: 'smtp.gmail.com',
//	port: 587,
//	secure: false,
//	auth: {
//		user: ,
//		pass: 
//	}
//});



var screensIO = io.of('/screens-namespace');
var projectorIO = io.of('/projectors-namespace');
var controlIO = io.of('/control-namespace');
var screens = [];

function getId() {
	var id = Math.floor(9000*Math.random()) + 1000;
	if (screens.indexOf(id) != -1) {
		return getId();
	} else {
		return id;
	}
}

screensIO.on('connection', function(socket) {
	var id = getId();

	screens.push(id);
	socket.join(id);

	socket.emit('id', id);

	socket.on('disconnect', function() {
		screens.splice(screens.indexOf(this), 1);
		projectorIO.to(this).emit('screen closed');
		controlIO.to(this).emit('screen closed');
	}.bind(id));

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
		projectorIO.to(this).emit('commenting');
		controlIO.to(this).emit('message', 'Record a comment by speaking into the microphone now.');
	}.bind(id));
	socket.on('message', function(text) {
		controlIO.to(this).emit('message', text);
	}.bind(id));
	socket.on('close message', function() {
		controlIO.to(this).emit('close message');
	}.bind(id));
});

projectorIO.on('connection', function(socket) {
	socket.on('id', function(id) {
		if (screens.indexOf(id) != -1) {
			socket.join(id);

			socket.on('explain request', function() {
				screensIO.to(this).emit('explain request');
				controlIO.to(this).emit('explain request');
			}.bind(id));
			socket.on('comment request', function(comments) {
				screensIO.to(this).emit('comment request', comments);
				controlIO.to(this).emit('comment request');
			}.bind(id));
			socket.on('comment end', function() {
				screensIO.to(this).emit('comment end');
				controlIO.to(this).emit('close message');
			}.bind(id));
			//socket.on('email', function(text) {
			//	transp.sendMail({
			//		from: ,
			//		to: ,
			//		subject: 'New Suns Explorer Comment',
			//		text: text,
			//		html: text
			//	});
			//});
		} else {
			socket.emit('invalid id');
		}
	});
});

controlIO.on('connection', function(socket) {
	socket.on('id', function(id) {
		if (screens.indexOf(id) != -1) {
			socket.join(id);

			socket.on('explain request', function() {
				screensIO.to(this).emit('explain request');
			}.bind(id));
			socket.on('comment request', function() {
				screensIO.to(this).emit('comment request');
			}.bind(id));
		} else {
			socket.emit('invalid id');
		}
	});
});
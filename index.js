// Load required packages
var express = require('express');
var http = require('http');
var app = express();
var server = app.listen(3000);
var compression = require('compression');
var io = require('socket.io').listen(server);
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;

// Add content compression middleware
app.use(compression());

// Add static middleware
app.use(express.static(__dirname + '/client'));

io.on('connection', function(socket) {
	console.log('a user connected');
	socket.on('list ports', function() {
		serialport.list(function (err, ports) {
			var port_list = [];
			ports.forEach(function(port) {
				port_list.push(port.comName);
				console.log(port.comName);
			});
			socket.emit('list ports', {list: port_list});
		});
	});
	socket.on('connect port', function(portName) {
		var port = new SerialPort(portName, {
			parser: serialport.parsers.readline('\n'),
			baudRate: 115200,
			lock: false
			});
		port.on('open', function () {
			console.log('Connected to', portName);
			var handshake = new Buffer(3);
			handshake[0] = 80;
			handshake[1] = 0x00;
			handshake[2] = 10;
			port.write(handshake, function(err, bytesWritten) {
				if (err) {
					return console.log('Error: ', err.message);
				}
			});
			socket.emit('connect port');
			socket.on('serial send', function(data) {
				console.log(data);
				var buffer = new Buffer(data + '\n', "ascii");
				console.log(buffer);
				var header = new Buffer(2);
				header[0] = 80;
				header[1] = 0x01;
				var send = Buffer.concat([header, buffer], header.length + buffer.length);
				console.log(send);
				port.write(send, function(err, bytesWritten) {
					if (err) {
						return console.log('Error: ', err.message);
					}
				});
			})
			port.on('data', function(data){
				console.log(data);
				if (data[0] == 'P' && data[1] == '1')
				{
				  	socket.emit('serial receive', data.substring(2));
				}
			});
			socket.on('disconnect', function()
			{
				port.close(function(err)
				{
					
				});
			});
			socket.on('disconnect port', function()
			{
				port.close(function(err)
				{
					socket.emit('disconnect port');
				});
			});
		});
	});
});

// Create our Express router
var router = express.Router();

// Register all our routes
app.use(router);
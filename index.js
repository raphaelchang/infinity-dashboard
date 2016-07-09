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
			baudRate: 115200
			});

		port.on('open', function () {
			console.log('Connected to', portName);
			socket.emit('connect port');
			socket.on('serial send', function(data) {
				var buffer = new Buffer('P ' + data + '\n', "ascii");
				buffer[1] = 0x00;
				port.write(buffer, function(err, bytesWritten) {
				if (err) {
					return console.log('Error: ', err.message);
				}
				});
			})
			port.on('data', function(data){
				console.log(data);
				if (data[0] == 'P' && data[1] == '0')
				{
				  	socket.emit('serial receive', data.substring(2));
				}
			});
			socket.on('disconnect', function()
			{
				port.close();
			});
		});
	});
});

// Create our Express router
var router = express.Router();

// Register all our routes
app.use(router);
$(function() {
	var socket = io();
	socket.emit('list ports');
	$('#listports').click(function() {
		socket.emit('list ports');
	});
	$('#connect').click(function() {
		socket.emit('connect port', $('#ports option:selected').val());
	});
	$('#input').keyup(function(e) {
		if (e.keyCode == 13) {
			socket.emit('serial send', $('#input').val());
			$('#input').val('');
		}
	});

	socket.on('list ports', function(list) {
		$('#ports').empty();
		list.list.forEach(function(port) {
			var option = $('<option></option>').attr("value", port).text(port);
			$('#ports').append(option);
		});
	});
	socket.on('serial receive', function(data) {
		console.log(data);
	});
});
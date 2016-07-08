$(function() {
	var connected = false;
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
	socket.on('connect port', function() {
		connected = true;
		$('#status').addClass("inverted blue");
		$('#status-text').html("Status:<br />Connected");
	});

	$('.menu .item')
	  .tab()
	;
	$('.ui.dropdown')
	  .dropdown()
	;
	$("#console").bind('keydown', function(e) {
		$("#cursor").replaceWith($("#cursor")); // Freeze cursor blinking when typing
		if (e.which === 8)
		{
			$("#console #input").text($("#console #input").text().substring(0, $("#console #input").text().length - 1))
		}
		else
		{
			$("#console #input").append(String.fromCharCode(e.which));
		}
		e.preventDefault();
	});
});
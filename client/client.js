$(function() {
	var connected = false;
	var waiting = false;
	var socket = io();
	socket.emit('list ports');
	$('#listports').click(function() {
		socket.emit('list ports');
	});
	$('#connect').click(function() {
		if (!connected)
		{
			socket.emit('connect port', $('#ports option:selected').val());
		}
		else
		{
			socket.emit('disconnect port');
		}
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
		if (waiting)
		{
			if (data == '\r')
			{
				$("#cmd").html(inputReset);
				$("#console").scrollTop(999999999);
				cursor = $(".cursor");
				historyIndex = 0;
				waiting = false;
			}
			else
			{
				$("#output").append(data);
				$("#output").append("<br />");
				$("#console").scrollTop(999999999);
			}
		}
	});
	socket.on('connect port', function() {
		connected = true;
		$("#cmd").html(inputReset);
		$("#console").scrollTop(999999999);
		cursor = $(".cursor");
		historyIndex = 0;
		waiting = false;
		$('#status').addClass("inverted blue");
		$('#status-text').html("Status:<br />Connected");
		$('#connect').text("Disconnect");
	});
	socket.on('disconnect port', function() {
		connected = false;
		$('#status').removeClass("inverted");
		$('#status').removeClass("blue");
		$('#status-text').html("Status:<br />Not Connected");
		$('#connect').text("Connect");
		$('#output').html('');
		$("#cmd").html('<span id="input"><span class="cursor noblink">&nbsp;</span></span>');
	})

	$('.menu .item')
	  .tab()
	;
	$('.ui.dropdown')
	  .dropdown()
	;
	var history = [];
	var inputReset = '<span>resc>&nbsp;</span><span id="input"><span class="cursor">&nbsp;</span></span>';
	var historyIndex = 0;
	var currentCommand;
	var cursor = $(".cursor");
	$("#console").bind("keypress", function(e) {
		if (waiting || !connected)
		{
			return;
		}
		cursor.replaceWith(cursor); // Freeze cursor blinking when typing
		e.preventDefault();
		if (e.which == 32)
		{
			$('<span />').html("&nbsp;").insertBefore(cursor);
		}
		else
		{
			$('<span />').html(String.fromCharCode(e.keyCode)).insertBefore(cursor);
		}
	});
	$("#console").bind("keydown", function(e) {
		if (!connected)
		{
			return;
		}
		if (waiting)
		{
			if (e.ctrlKey && e.which == 67)
			{
				$("#cmd").html(inputReset);
				$("#console").scrollTop(999999999);
				cursor = $(".cursor");
				historyIndex = 0;
				waiting = false;
			}
			return;
		}
		cursor.replaceWith(cursor); // Freeze cursor blinking when typing
		if (e.keyCode == 8) {
			cursor.prev().remove();
			e.preventDefault();
		}
		else if (e.ctrlKey && e.which == 67)
		{
			$("#cmd").html(inputReset);
			cursor = $(".cursor");
			historyIndex = 0;
			e.preventDefault();
		}
		else if (e.which == 13)
		{
			cursor.removeClass('cursor');
			$("#output").append($("#cmd").html());
			$("#output").append("<br />");
			$("#console").scrollTop(999999999);
			if ($.trim($("#cmd #input").text()) != '')
			{
				history.push($("#cmd #input").html());
				var trimmed = $.trim($("#cmd #input").text()).replace(/\s+/g, " ");
				trimmed = trimmed.replace(/[^\x20-\x7E]+/g, '');
				socket.emit('serial send', trimmed);
				$("#cmd").html('<span class="cursor noblink">&nbsp;</span>');
				waiting = true;
			}
			else
			{
				$("#cmd").html(inputReset);
				cursor = $(".cursor");
				historyIndex = 0;
				waiting = false;
			}
			e.preventDefault();
		}
		else if (e.which == 37)
		{
			var temp = cursor.prev();
			if (temp.is('span'))
			{
				cursor.removeClass("cursor");
				cursor = temp;
				cursor.addClass("cursor");
			}
			e.preventDefault();
		}
		else if (e.which == 39)
		{
			var temp = cursor.next();
			if (temp.is('span'))
			{
				cursor.removeClass("cursor");
				cursor = temp;
				cursor.addClass("cursor");
			}
			e.preventDefault();
		}
		else if (e.which == 38)
		{
			if (historyIndex < history.length)
			{
				if (historyIndex == 0)
				{
					currentCommand = $("#cmd #input").html();
				}
				historyIndex++;
				$("#cmd #input").html(history[history.length - historyIndex]);
				cursor = $("#cmd #input").children().last();
				cursor.addClass("cursor");
			}
			e.preventDefault();
		}
		else if (e.which == 40)
		{
			if (historyIndex > 0)
			{
				if (historyIndex == 1)
				{
					$("#cmd #input").html(currentCommand);
				}
				historyIndex--;
				$("#cmd #input").html(history[history.length - historyIndex]);
				cursor = $("#cmd #input").children().last();
				cursor.addClass("cursor");
			}
			e.preventDefault();
		}
	});
});
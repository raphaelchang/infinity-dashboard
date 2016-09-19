$(function() {
    var connected = false;
    var waiting = false;
    var socket = io();

    var scale1 = d3.scale.linear().domain([-2, 2]).nice();
    var scale2 = d3.scale.linear().domain([-5000, 5000]).nice();
    var series = new Rickshaw.Series.FixedDuration([{ name: 'current_q', color: 'blue', scale: scale1 }, { name: 'current_d', color: 'red', scale: scale1 }, { name: 'erpm', color: 'green', scale: scale2 }], undefined, {
	timeInterval: 100,
	timeBase: new Date().getTime() / 1000,
	maxDataPoints: 250
    }); 
    var graph = new Rickshaw.Graph({
	element: $("#graph")[0],
	width: $("#graph").parent().width() - 90,
	height: 400,
        renderer: 'line',
        series: series,
        min: 'auto'
    });
    var y_ticks = new Rickshaw.Graph.Axis.Y.Scaled( {
        graph: graph,
        orientation: 'left',
        scale: scale1,
        tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
        element: document.getElementById('y_axis_left')
    } );
    var y_ticks2 = new Rickshaw.Graph.Axis.Y.Scaled( {
        graph: graph,
        orientation: 'right',
        tickFormat: Rickshaw.Fixtures.Number.formatKMBT,
        scale: scale2,
        element: document.getElementById('y_axis_right')
    } );
    new Rickshaw.Graph.HoverDetail( {
        graph: graph
    });
    graph.render();
    socket.on('graph', function(data) {
        graph.series.addData(data);
        graph.render();
        console.log(data);
    });

    socket.emit('list ports');
    $('#listports').click(function() {
	socket.emit('list ports');
    });
    $('#connect').click(function() {
        if (!connected)
        {
            console.log($('#ports').dropdown('get value'));
            socket.emit('connect port', $('#ports').dropdown('get value'));
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
        $('#ports .menu').empty();
        list.list.forEach(function(port) {
            var option = $('<div class="item" value="' + port + '"></div>').text(port);
            $('#ports .menu').append(option);
        });
        if (list.list.indexOf($('#ports').dropdown('get value')) == -1)
        {
            $('#ports').dropdown('set value', '');
            $('#ports .text').text("Select Port...");
        }
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
        $('#status i').removeClass("grey");
        $('#status i').addClass("blue");
        $('#status div').text("Connected");
        $('#connect span').text("Disconnect");
    });
    socket.on('disconnect port', function() {
        connected = false;
        $('#status i').removeClass("blue");
        $('#status i').addClass("grey");
        $('#status div').text("Not Connected");;
        $('#connect span').text("Connect");
        $('#output').html('');
        $("#cmd").html('<span id="input"><span class="cursor noblink">&nbsp;</span></span>');
        $("#voltage").html("0.0");
        $("#temperature").html("0.0");
        socket.emit('list ports');
    });

    socket.on('voltage', function(data) {
        $("#voltage").html(data);
    });
    socket.on('temperature', function(data) {
        $("#temperature").html(data);
    });

    $('.menu .item')
        .tab()
        ;
    $('.ui.dropdown')
        .dropdown()
        ;
    $('#duty').on('change', function()
    {
        socket.emit('set duty', $('#duty').val());
    });
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

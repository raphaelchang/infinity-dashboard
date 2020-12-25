$(function() {
    var connected = false;
    var waiting = false;
    var selectedDeviceName = "";
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
	width: $("#graph").parent().width() - 60,
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
        graph.configure({width: $("#graph").parent().width() - 60, height: 400});
        graph.render();
        console.log(data);
    });
    $(".ui.modal").modal({closable: false});
    socket.on('disconnect', function(){
        $(".ui.modal").modal('show');
        connected = false;
        $('#status i').attr("class", "grey circle icon");
        $('#status .content').text("Not Connected");
        $('#connect span').text("Connect");
        $('#output').html('');
        $("#cmd").html('<span id="input"><span class="cursor noblink">&nbsp;</span></span>');
        $("#voltage").html("0.0");
        $("#temperature").html("0.0");
        $('#ports').dropdown('set value', '');
        $('#ports').dropdown('set selected', '');
        $('#ports #select-port').text("Select Port...");
    });
    socket.on('connect', function(){
        $(".ui.modal").modal('hide');
	socket.emit('list ports');
    });
    socket.emit('list ports');
    $('#listports').click(function() {
	socket.emit('list ports');
    });
    $('#connect').click(function() {
        if (!connected)
        {
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
            var option = $('<div class="item" value="' + port.comName + '"><div class="text">' + port.comName + '</div><div class="description" style="float: none; margin: 0; margin-top: 4px">' + port.manufacturer.split(' ')[0] + ' v' + port.serialNumber + '</div></div>');
            $('#ports .menu').append(option);
        });
        if (list.list.indexOf($('#ports').dropdown('get value')) == -1)
        {
            $('#ports').dropdown('set value', '');
            $('#ports #select-port').text("Select Port...");
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
        $('#status .content').html(selectedDeviceName + '<div class="sub header">Status: Idle</div>');
        $('#connect span').text("Disconnect");
    });
    socket.on('disconnect port', function() {
        connected = false;
        $('#status i').attr("class", "grey circle icon");
        $('#status .content').text("Not Connected");
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
    socket.on('status_update', function(data) {
        if (data.command == null)
            return;
        if (data.state == 0x01)
        {
            if (data.command > 0)
            {
                $('#status i').attr("class", "green circle icon");
                $('#status .content .sub.header').text('Status: Forward');
            }
            else if (data.command < 0)
            {
                $('#status i').attr("class", "red circle icon");
                $('#status .content .sub.header').text('Status: Reverse');
            }
            else
            {
                $('#status i').attr("class", "yellow circle icon");
                $('#status .content .sub.header').text('Status: Neutral');
            }
        }
        else if (data.fault > 0)
        {
            $('#status i').attr("class", "orange circle icon");
            if (data.fault == 1)
                $('#status .content .sub.header').text('Status: Fault (Undervoltage)');
            else if (data.fault == 2)
                $('#status .content .sub.header').text('Status: Fault (Overvoltage)');
            else if (data.fault == 3)
                $('#status .content .sub.header').text('Status: Fault (Overcurrent)');
            else if (data.fault == 4)
                $('#status .content .sub.header').text('Status: Fault (Temperature)');
        }
        else
        {
            $('#status i').attr("class", "blue circle icon");
            $('#status .content .sub.header').text('Status: Idle');
        }
    });

    $('.menu .item')
        .tab()
        ;
    $('.ui.dropdown')
        .dropdown({
            action: 'activate',
            onChange: function(value, text, $selectedItem)
            {
                $('#ports #select-port .description').remove();
                if ($selectedItem !== undefined)
                {
                    $('#ports').dropdown('set value', $selectedItem.attr('value'));
                    selectedDeviceName = $selectedItem.find('.description').text();
                }
            }
        })
    ;
    $('#duty').on('change', function()
    {
        socket.emit('set duty', $('#duty').val());
    });

    $('#hv-lim').focus(function()
    {
        $('#v-lim-icon').stop();
        $('#v-lim-icon').fadeTo(200, 1);
    });
    $('#hv-lim').focusout(function()
    {
        $('#v-lim-icon').stop();
        $('#v-lim-icon').fadeTo(200, 0.5);
    });
    $('#lv-lim').focus(function()
    {
        $('#v-lim-icon').stop();
        $('#v-lim-icon').fadeTo(200, 0);
    });
    $('#lv-lim').focusout(function()
    {
        $('#v-lim-icon').stop();
        $('#v-lim-icon').fadeTo(200, 0.5);
    });
    $('#batt-max').focus(function()
    {
        $('#battery-icon').stop();
        $('#battery-icon').fadeTo(200, 1);
        $('#left-icon').stop();
        $('#left-icon').fadeTo(200, 0.5);
        $('#right-icon').stop();
        $('#right-icon').fadeTo(200, 1);
        $('#motor-icon').stop();
        $('#motor-icon').fadeTo(200, 0.5);
    });
    $('#batt-max').focusout(function()
    {
        $('#battery-icon').stop();
        $('#battery-icon').fadeTo(200, 0.5);
        $('#left-icon').stop();
        $('#left-icon').fadeTo(200, 0.5);
        $('#right-icon').stop();
        $('#right-icon').fadeTo(200, 0.5);
        $('#motor-icon').stop();
        $('#motor-icon').fadeTo(200, 0.5);
    });
    $('#batt-min').focus(function()
    {
        $('#battery-icon').stop();
        $('#battery-icon').fadeTo(200, 1);
        $('#left-icon').stop();
        $('#left-icon').fadeTo(200, 1);
        $('#right-icon').stop();
        $('#right-icon').fadeTo(200, 0.5);
        $('#motor-icon').stop();
        $('#motor-icon').fadeTo(200, 0.5);
    });
    $('#batt-min').focusout(function()
    {
        $('#battery-icon').stop();
        $('#battery-icon').fadeTo(200, 0.5);
        $('#left-icon').stop();
        $('#left-icon').fadeTo(200, 0.5);
        $('#right-icon').stop();
        $('#right-icon').fadeTo(200, 0.5);
        $('#motor-icon').stop();
        $('#motor-icon').fadeTo(200, 0.5);
    });
    $('#motor-max').focus(function()
    {
        $('#battery-icon').stop();
        $('#battery-icon').fadeTo(200, 0.5);
        $('#left-icon').stop();
        $('#left-icon').fadeTo(200, 0.5);
        $('#right-icon').stop();
        $('#right-icon').fadeTo(200, 1);
        $('#motor-icon').stop();
        $('#motor-icon').fadeTo(200, 1);
    });
    $('#motor-max').focusout(function()
    {
        $('#battery-icon').stop();
        $('#battery-icon').fadeTo(200, 0.5);
        $('#left-icon').stop();
        $('#left-icon').fadeTo(200, 0.5);
        $('#right-icon').stop();
        $('#right-icon').fadeTo(200, 0.5);
        $('#motor-icon').stop();
        $('#motor-icon').fadeTo(200, 0.5);
    });
    $('#motor-min').focus(function()
    {
        $('#battery-icon').stop();
        $('#battery-icon').fadeTo(200, 0.5);
        $('#left-icon').stop();
        $('#left-icon').fadeTo(200, 1);
        $('#right-icon').stop();
        $('#right-icon').fadeTo(200, 0.5);
        $('#motor-icon').stop();
        $('#motor-icon').fadeTo(200, 1);
    });
    $('#motor-min').focusout(function()
    {
        $('#battery-icon').stop();
        $('#battery-icon').fadeTo(200, 0.5);
        $('#left-icon').stop();
        $('#left-icon').fadeTo(200, 0.5);
        $('#right-icon').stop();
        $('#right-icon').fadeTo(200, 0.5);
        $('#motor-icon').stop();
        $('#motor-icon').fadeTo(200, 0.5);
    });
    $('#motor-res').focus(function()
    {
        $('#motor-res-icon').stop();
        $('#motor-res-icon').fadeTo(200, 1);
        $('#motor-ind-icon').stop();
        $('#motor-ind-icon').fadeTo(200, 0.5);
        $('#motor-linkage-icon').stop();
        $('#motor-linkage-icon').fadeTo(200, 0.5);
    });
    $('#motor-res').focusout(function()
    {
        $('#motor-res-icon').stop();
        $('#motor-res-icon').fadeTo(200, 0.5);
        $('#motor-ind-icon').stop();
        $('#motor-ind-icon').fadeTo(200, 0.5);
        $('#motor-linkage-icon').stop();
        $('#motor-linkage-icon').fadeTo(200, 0.5);
    });
    $('#motor-ind').focus(function()
    {
        $('#motor-res-icon').stop();
        $('#motor-res-icon').fadeTo(200, 0.5);
        $('#motor-ind-icon').stop();
        $('#motor-ind-icon').fadeTo(200, 1);
        $('#motor-linkage-icon').stop();
        $('#motor-linkage-icon').fadeTo(200, 0.5);
    });
    $('#motor-ind').focusout(function()
    {
        $('#motor-res-icon').stop();
        $('#motor-res-icon').fadeTo(200, 0.5);
        $('#motor-ind-icon').stop();
        $('#motor-ind-icon').fadeTo(200, 0.5);
        $('#motor-linkage-icon').stop();
        $('#motor-linkage-icon').fadeTo(200, 0.5);
    });
    $('#motor-linkage').focus(function()
    {
        $('#motor-res-icon').stop();
        $('#motor-res-icon').fadeTo(200, 0.5);
        $('#motor-ind-icon').stop();
        $('#motor-ind-icon').fadeTo(200, 0.5);
        $('#motor-linkage-icon').stop();
        $('#motor-linkage-icon').fadeTo(200, 1);
    });
    $('#motor-linkage').focusout(function()
    {
        $('#motor-res-icon').stop();
        $('#motor-res-icon').fadeTo(200, 0.5);
        $('#motor-ind-icon').stop();
        $('#motor-ind-icon').fadeTo(200, 0.5);
        $('#motor-linkage-icon').stop();
        $('#motor-linkage-icon').fadeTo(200, 0.5);
    });
    $('.help.circle.icon')
        .popup(
                {on: 'click'}
              )
        ;
    var history = [];
    var inputReset = '<span>infinity>&nbsp;</span><span id="input"><span class="cursor">&nbsp;</span></span>';
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

/* Fluksometer chart plotting script;
retrieves data stored via node persist_mqtt.js and
served by node serve_chart.js

uses the flotcharts.org plotting library - with the
corresponding license

this script under MIT-license, as is, without any
warrenty

Markus Gebhard, Karlsruhe, May 2014, (c) */

// determine locally stored time interval
var chart = new Array(); // the received chart series 
var selChart = new Array(); // the chart to be displayed
var options = {
	series : {
		lines : { show : true, steps : true },
		points : { show : false }
	},
	xaxis : {
		mode : "time",
		timezone : "browser"
	},
	yaxis : {
		min : 0
	},
	selection : {
		mode : "x"
	}
}; // chart display options
var fromDate, fromTime, toDate, toTime; // the time interval borders

// prepare channel to server
var socket = io.connect(location.host);

socket.on('connect', function () {
	// get information to be printed within the chart div
	socket.on('info', function (info) {
		$("#info").html(info);
	}); //socket.on
	// plot the received data series
	socket.on('series', function (res) {
		// clear any existing series
		chart = [];
		// format the data object
		for (var i in res) {
			var serobj = {};
			serobj["label"] = i;
			serobj["data"] = res[i];
			chart.push(serobj);
		// add graph selection option
		$('#choices').append("<div class='checkbox'>" +
			"<small><label>" +
			"<input type='checkbox' id='" +
			i + "' checked='checked'></input>" +
			i + "</label></small>" +
			"</div>");
		} //for
		// process the chart selection
		$("#choices").find("input").on("click", plotSelChart);
		function plotSelChart () {
			selChart = [];
			$("#choices").find("input:checked").each(function () {
				var key = $(this).attr("id");
				var s = chart.filter(function (o) {
					return o.label == key;
				});
				selChart.push(s[0]);
			});
			$("#chart").plot(selChart, options);		
		}
		// and finally plot the graph
		$("#info").text('');
		plotSelChart();
		// process selection time interval
		$("#chart").on("plotselected", function (event, range) {
			var selFrom = range.xaxis.from.toFixed(0);
			var selTo = range.xaxis.to.toFixed(0);
			var showChart = new Array();
			// filter values within the selected time interval
			for (var i in selChart) {
				var selObj = {};
				selObj["label"] = chart[i].label;
				selObj["data"] = chart[i].data.filter(function (v) {
						return v[0] >= selFrom && v[0] <= selTo
					});
				showChart.push(selObj);
			} //for
			$("#chart").plot(showChart, options);
			$("#info").html('<div align=\"center\"><button class=\"btn btn-primary btn-sm\" id=\"reset\">Reset</button></div>');
			// redraw the queried data
			$("#reset").on("click", function () {
				$("#chart").plot(selChart, options);
			});
		});
	});
});

// executed after rendering the complete page; alternative: $(function() {});
$(document).ready(function () {
	// set the time interval to the current time
	$('#refresh').on("click", function () {
		var dNow = new Date();
		var day = dNow.getDate();
		day = (day < 10 ? '0' + day : day);
		var month = dNow.getMonth() + 1;
		month = (month < 10 ? '0' + month : month);
		var hrs = dNow.getHours();
		hrs = (hrs < 10 ? '0' + hrs : hrs);
		var min = dNow.getMinutes();
		min = (min < 10 ? '0' + min : min);
		var sec = dNow.getSeconds();
		sec = (sec < 10 ? '0' + sec : sec);
		var localDate = dNow.getFullYear() + '-' + month + '-' + day;
		var localTime = hrs + ':' + min + ':' + sec;
		$('#fromDate').val(localDate);
		$('#fromTime').val(localTime);
		$('#toDate').val(localDate);
		$('#toTime').val(localTime);
		// clear the chart area
		$('#chart').html('');
		$('#info').html('');
		$('#choices').html('');
	});
	// prepare and emit the query request
	$('#submit').on("click", function () {
		fromDate = $('#fromDate').val();
		fromTime = $('#fromTime').val();
		toDate = $('#toDate').val();
		toTime = $('#toTime').val();
		$('#choices').html('');
		emit();
	});
	// size the output area
	var offset = 20; //px
	var width = $(document).width() - offset * 2;
	var height = width * 3 / 4;
	height = (height>600?600:height);
	$("#chart").width(width).height(height).offset({
		left : offset
	});

	// Selection button handling
	$("#sel_pnl").click(function () {
		window.location = 'index.html';
	});
	$("#sel_cnt").click(function () {
		window.location = 'panel.html';
	});
	$("#sel_gph").click(function () {
		window.location = 'graph.html';
	});
	$("#sel_cht").click(function () {
		window.location = 'chart.html';
	});
});

// emit the query request to the server part
function emit() {
	var data = {};
	var from = Date.parse(fromDate + 'T' + fromTime + 'Z') / 1000;
	var to = Date.parse(toDate + 'T' + toTime + 'Z') / 1000;
	var offset = new Date().getTimezoneOffset() * 60;
	data.fromTimestamp = from + offset;
	data.toTimestamp = to + offset;
	$("#chart").html('');
	$("#info").html('');
	socket.emit('query', data);
}


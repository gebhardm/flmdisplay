/* Fluksometer chart plotting script;
retrieves data stored via node persist_mqtt.js and served by
node serve_chart.js

Uses the http://flotcharts.org plotting library - with the
corresponding license

This script under MIT-license, as is, without any warranty

Markus Gebhard, Karlsruhe, May/August 2014, (c) */
// determine locally stored time interval
var chart = new Array();

// the received chart series
var selChart = new Array();

// the chart to be displayed
var options = {
    series: {
        lines: {
            show: true,
            steps: true
        },
        points: {
            show: false
        }
    },
    grid: {
        hoverable: true
    },
    xaxis: {
        mode: "time",
        timezone: "browser"
    },
    yaxis: {
        min: 0
    },
    selection: {
        mode: "x"
    }
};

// chart display options
var fromDate, fromTime, toDate, toTime;

// the time interval borders
// prepare channel to server
var socket = io.connect(location.host);

socket.on("connect", function() {
    // get information to be printed within the chart div
    socket.on("info", function(info) {
        $("#info").html(info);
    });
    //socket.on
    // plot the received data series
    socket.on("series", function(res) {
        // clear any existing series
        chart = [];
        // format the data object
        var color = 0;
        for (var i in res) {
            var serobj = {};
            serobj.label = i;
            serobj.data = res[i];
            serobj.color = color;
            color++;
            chart.push(serobj);
            // add graph selection option
            $("#choices").append("<div class='checkbox'>" + "<small><label>" + "<input type='checkbox' id='" + i + "' checked='checked'></input>" + i + "</label></small>" + "</div>");
        }
        //for
        // process the chart selection
        $("#choices").find("input").on("click", plotSelChart);
        function plotSelChart() {
            selChart = [];
            $("#choices").find("input:checked").each(function() {
                var key = $(this).attr("id");
                var s = chart.filter(function(o) {
                    return o.label == key;
                });
                selChart.push(s[0]);
            });
            $("#info").html("");
            // size the output area
            var width = $("#chartpanel").width();
            var height = width * 3 / 4;
            height = height > 600 ? 600 : height;
            $("#chart").width(width).height(height);
            $("#chart").plot(selChart, options);
        }
        // and finally plot the graph
        $("#info").html("");
        plotSelChart();
    });
});

// executed after rendering the complete page; alternative: $(function() {});
$(document).ready(function() {
    // set the time interval to the current time
    $("#refresh").on("click", function() {
        var dNow = new Date();
        var day = dNow.getDate();
        day = day < 10 ? "0" + day : day;
        var month = dNow.getMonth() + 1;
        month = month < 10 ? "0" + month : month;
        var hrs = dNow.getHours();
        hrs = hrs < 10 ? "0" + hrs : hrs;
        var min = dNow.getMinutes();
        min = min < 10 ? "0" + min : min;
        var sec = dNow.getSeconds();
        sec = sec < 10 ? "0" + sec : sec;
        var localDate = dNow.getFullYear() + "-" + month + "-" + day;
        var localTime = hrs + ":" + min + ":" + sec;
        $("#fromDate").val(localDate);
        $("#fromTime").val(localTime);
        $("#toDate").val(localDate);
        $("#toTime").val(localTime);
        // clear the chart area
        $("#chart").html("");
        $("#info").html("");
        $("#choices").html("");
    });
    // prepare and emit the query request
    $("#submit").on("click", function() {
        fromDate = $("#fromDate").val();
        fromTime = $("#fromTime").val();
        toDate = $("#toDate").val();
        toTime = $("#toTime").val();
        $("#choices").html("");
        emit();
    });
    // allow tooltip on datapoints
    $("<div id='tooltip'></div>").css({
        position: "absolute",
        display: "none",
        border: "1px solid #ccc",
        padding: "2px",
        opacity: .9
    }).appendTo("body");
    // process hover
    $("#chart").on("plothover", function(event, pos, item) {
        if (item) {
            var itemTime = new Date(item.datapoint[0]);
            var hrs = itemTime.getHours();
            hrs = hrs < 10 ? "0" + hrs : hrs;
            var min = itemTime.getMinutes();
            min = min < 10 ? "0" + min : min;
            var sec = itemTime.getSeconds();
            sec = sec < 10 ? "0" + sec : sec;
            $("#tooltip").html(hrs + ":" + min + ":" + sec + " : " + item.datapoint[1]).css({
                top: item.pageY + 7,
                left: item.pageX + 5
            }).fadeIn(200);
        } else $("#tooltip").hide();
    });
    // process selection time interval
    $("#chart").on("plotselected", function(event, range) {
        var selFrom = range.xaxis.from.toFixed(0);
        var selTo = range.xaxis.to.toFixed(0);
        var details = new Array();
        // filter values within the selected time interval
        for (var i in selChart) {
            var selObj = {};
            selObj.color = selChart[i].color;
            selObj.label = selChart[i].label;
            selObj.data = selChart[i].data.filter(function(v) {
                return v[0] >= selFrom && v[0] <= selTo;
            });
            details.push(selObj);
        }
        // size the output area
        var width = $("#chartpanel").width();
        var height = width * 3 / 4;
        height = height > 600 ? 600 : height;
        $("#chart").width(width).height(height);
        $("#chart").plot(details, options);
        $("#info").html('<div align="center"><button class="btn btn-primary btn-sm" id="reset">Reset</button></div>');
        // redraw the queried data
        $("#reset").on("click", function() {
            $("#chart").plot(selChart, options);
        });
    });
    // emit the query request to the server part
    function emit() {
        var data = {};
        var from = Date.parse(fromDate + "T" + fromTime + "Z") / 1e3;
        var to = Date.parse(toDate + "T" + toTime + "Z") / 1e3;
        var offset = new Date().getTimezoneOffset() * 60;
        data.fromTimestamp = from + offset;
        data.toTimestamp = to + offset;
        $("#chart").html("");
        $("#info").html("");
        socket.emit("query", data);
    }
});
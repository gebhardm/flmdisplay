$(document).ready(function() {
	$(document.body).append("<div class=\"panel-body\" align=\"center\" id=\"buttons\"> \
	<button class=\"btn btn-primary btn-sm\" id=\"sel_gauge\">Gauge</button> \
	<button class=\"btn btn-primary btn-sm\" id=\"sel_graph\">Graph</button> \
	<button class=\"btn btn-primary btn-sm\" id=\"sel_panel\">Panel</button> \
	<button class=\"btn btn-primary btn-sm\" id=\"sel_chart\">Chart</button>\
	</div>");
    // Selection button handling
    $("#sel_gauge").click(function() {
        window.location = "index.html";
    });
    $("#sel_panel").click(function() {
        window.location = "panel.html";
    });
    $("#sel_graph").click(function() {
        window.location = "graph.html";
    });
    $("#sel_chart").click(function() {
        window.location = "chart.html";
    });
});

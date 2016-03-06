$(document).ready(function() {
	$(document.body).append("<div class=\"panel-body\" align=\"center\"> \
	<button class=\"btn btn-primary btn-sm\" id=\"sel_chart\">Chart</button> \
	<button class=\"btn btn-primary btn-sm\" id=\"sel_consumption\">Consumption</button> \
	<button class=\"btn btn-primary btn-sm\" id=\"sel_gauge\">Gauge</button> \
	<button class=\"btn btn-primary btn-sm\" id=\"sel_graph\">Graph</button> \
	<button class=\"btn btn-primary btn-sm\" id=\"sel_panel\">Panel</button> \
	</div>");
    // Selection button handling
    $("#sel_chart").click(function() {
        window.location = "chart.html";
    });
    $("#sel_consumption").click(function() {
        window.location = "consumption.html";
    });
    $("#sel_gauge").click(function() {
        window.location = "gauge.html";
    });
    $("#sel_panel").click(function() {
        window.location = "panel.html";
    });
    $("#sel_graph").click(function() {
        window.location = "graph.html";
    });
});

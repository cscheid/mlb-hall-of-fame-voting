var width = 1100, height = 500;
var margin = { top: 20, right: 20, bottom: 40, left: 50 };
var first_year = 1936, last_year = 2013;

function create_player(entry)
{
    return {
        Name: entry.Name,
        Appearances: []
    };
}

function create_players(csv) {
    var players = {};

    for (var i=0; i<csv.length; ++i) {
        var entry = csv[i];
        var player = players[entry.Name];
        if (player === undefined) {
            player = create_player(entry);
            players[player.Name] = player;
        }
        player.Appearances.push(entry);
    }

    for (var player_name in players) {
        var player = players[player_name];
        player.Appearances.sort(function(a1, a2) {
            a1 = Number(a1.Year);
            a2 = Number(a2.Year);
            return a1 - a2;
        });
    }

    var lst = [];
    for (player_name in players) {
        lst.push(players[player_name]);
    };
    players = lst;

    return players;
}

d3.csv("HOFvotingdata.csv", function(error, csv) {
    var players = create_players(csv);

    var svg = d3.select("#main").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    svg.append("rect")
        .attr("fill", "black")
        .attr("fill-opacity", 0.1)
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", width)
        .attr("height", height);

    var y = d3.scale.linear()
        .domain([0, 100])
        .range([margin.top+height, margin.top]);

    var x = d3.scale.linear()
        .domain([first_year, last_year])
        .range([margin.left, margin.left+width]);

    var xAxis = d3.svg.axis();
    xAxis.scale(x).tickFormat(d3.format("d"));

    xAxis.orient("bottom");
    svg.append("g")
        .attr("transform", "translate(0," + (margin.top + height) + ")")
        .attr("class", "axis").call(xAxis);

    var yAxis = d3.svg.axis();
    yAxis.scale(y).tickFormat(d3.format("d"));
			 
    yAxis.orient("left");
    svg.append("g")
	.attr("transform", "translate(" + margin.left + ",0)")
	.attr("class", "axis").call(yAxis);

    svg.append("line")
        .attr("x1", x(first_year))
        .attr("x2", x(last_year))
        .attr("y1", y(5))
        .attr("y2", y(5))
        .attr("stroke", "red");

    svg.append("line")
        .attr("x1", x(first_year))
        .attr("x2", x(last_year))
        .attr("y1", y(75))
        .attr("y2", y(75))
        .attr("stroke", "green");

    var box1 = svg.append("g");
    var box2 = svg.append("g");

    var lines = {};

    var colors = d3.scale.category10();

    // var colors = ["black", "green", "blue", "purple", "orange", "red"];
    // var colors = d3.scale.ordinal()
    //     .domain([0, 1, 2, 3, 4, 5])
    //     .range(["black", "green", "blue", "purple", "orange", "red"]);

    box2.selectAll("circle")
        .data(players)
        .enter()
        .append("circle")
        .style("cursor", "hand")
        .attr("r", 5)
	.attr("fill", function(player) {
	    var la = player.Appearances[player.Appearances.length-1];
            return colors(Number(la.method));
	})
        .attr("stroke", "none")
        .attr("cx", function(player) {
            var la = player.Appearances[player.Appearances.length-1];
            var year = Number(la.Year);
            return x(year);
        })
        .attr("cy", function(player) {
            var la = player.Appearances[player.Appearances.length-1];
            var pct = Number(la["X.vote"].substring(0, la["X.vote"].length-1));
            return y(pct);
        })

        .on("mouseover", function(d) { 
            lines[d.Name]
                .transition()
                .attr("stroke", "rgba(0,0,0,1)")
                .attr("stroke-width", 3); 
        })
        .on("mouseout", function(d){ 
            lines[d.Name]
                .transition()
                .attr("stroke", "rgba(0,0,0,0.3)")
                .attr("stroke-width", 1);
        })
	.append("svg:title")
        .text(function(player) {
            return player.Name;
        });

    for (var i=0; i<players.length; ++i) {
        var line = d3.svg.line()
            .x(function(a) { return x(Number(a.Year)); })
            .y(function(a) { return y(Number(a["X.vote"].substring(0, a["X.vote"].length-1))); });
        
        lines[players[i].Name] = 
            box1.append("svg:path")
            .attr("d", line(players[i].Appearances))
            .attr("stroke", "rgba(0,0,0,0.3)")
            .attr("fill", "none");
    }
			 
    svg.append("text")
	.attr("class", "x label")
	.attr("text-anchor", "end")
	.attr("x", margin.left + width/2 + 20)
	.attr("y", height + margin.top + margin.bottom)
	.text("Year of Vote");
			 
    // Add a y-axis label.
    svg.append("text")
	.attr("class", "y label")
	.attr("text-anchor", "end")
	.attr("x", -height/2 + margin.left)
	.attr("y", margin.top)
	.attr("transform", "rotate(-90)")
	.text("Percentage of Ballots");

    var legend = d3.select("#legend").append("svg")
        .attr("width", 100)
        .attr("height", margin.top + height + margin.bottom);

    var legend_items = legend.selectAll("g")
        .data(["method 0",
               "method 1",
               "method 2",
               "method 3",
               "method 4",
               "method 5"])
        .enter()
        .append("g");

    var legend_y = d3.scale.linear()
        .domain([0, 6])
        .range([margin.top, margin.top + 6 * 20]);

    legend_items.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("x", 5)
        .attr("y", function(d, i) { return legend_y(i); })
        .attr("stroke", "none")
        .attr("fill", function(d, i) { return colors(i); });

    legend_items.append("text")
        .text(function(d) { return d; })
        .attr("x", 18)
        .attr("y", function(d, i) { return legend_y(i) + 10; });
});

var width = 1100, height = 500;
var margin = { top: 20, right: 20, bottom: 40, left: 50 };

// var min = Infinity,
//     max = -Infinity;

// var chart = d3.box()
//     .whiskers(iqr(1.5))
//     .width(width)
//     .height(height);

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
            // if (a1 < a2)
            //     return -1;
            // else if (a1 > a2)
            //     return 1;
            // else
            //     return 0;
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

    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    svg.append("rect")
        .attr("fill", "rgba(0,0,0,0.1)")
        .attr("x", margin.left)
        .attr("y", margin.top)
        .attr("width", width)
        .attr("height", height);

    var y = d3.scale.linear()
        .domain([0, 100])
        .range([margin.top+height, margin.top]);

    var x = d3.scale.linear()
        .domain([1936, 2013])
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
        .attr("x1", x(1936))
        .attr("x2", x(2013))
        .attr("y1", y(5))
        .attr("y2", y(5))
        .attr("stroke", "red");

    svg.append("line")
        .attr("x1", x(1936))
        .attr("x2", x(2013))
        .attr("y1", y(75))
        .attr("y2", y(75))
        .attr("stroke", "green");

    var lines = {};

    var colors = ["black", "green", "blue", "purple", "orange", "red"];

    svg.selectAll("circle")
        .data(players)
        .enter()
        .append("circle")
        .attr("r", 5)
	.attr("fill", function(player) {
	    var la = player.Appearances[player.Appearances.length-1];
            var col = colors[Number(la.method)];
            return col;
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
            svg.append("svg:path")
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
});

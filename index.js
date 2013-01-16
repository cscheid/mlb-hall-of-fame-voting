var width = window.innerWidth * 0.75, height = window.innerHeight * 0.5;
var margin = { top: 20, right: 20, bottom: 40, left: 50 };
var first_year = 1936, last_year = 2013;
var largest_histogram_count = 0;

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

    var trajectory_y = d3.scale.linear()
        .domain([0, 100])
        .range([margin.top+height, margin.top]);

    var histogram_y = d3.scale.linear()
        .domain([0, largest_histogram_count])
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
    yAxis.scale(trajectory_y).tickFormat(d3.format("d"));
    
    yAxis.orient("left");
    svg.append("g")
	.attr("transform", "translate(" + margin.left + ",0)")
	.attr("class", "axis").call(yAxis);

    svg.append("line")
        .attr("x1", x(first_year))
        .attr("x2", x(last_year))
        .attr("y1", trajectory_y(5))
        .attr("y2", trajectory_y(5))
        .attr("stroke", "red");

    svg.append("line")
        .attr("x1", x(first_year))
        .attr("x2", x(last_year))
        .attr("y1", trajectory_y(75))
        .attr("y2", trajectory_y(75))
        .attr("stroke", "green");

    var box1 = svg.append("g");
    var box2 = svg.append("g");

    var lines = {};

    var colors = d3.scale.category10();

    // var colors = ["black", "green", "blue", "purple", "orange", "red"];
    // var colors = d3.scale.ordinal()
    //     .domain([0, 1, 2, 3, 4, 5])
    //     .range(["black", "green", "blue", "purple", "orange", "red"]);

    box2.selectAll("rect")
        .data(players)
        .enter()
        .append("rect")
        .style("cursor", "pointer")
        .attr("fill-opacity", 1)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("width", 10)
        .attr("height", 10)
	.attr("fill", function(player) {
	    var la = player.Appearances[player.Appearances.length-1];
            return colors(Number(la.method));
	})
        .attr("stroke", "none")
        .attr("x", function(player) { return x(player.last_appearance)-5; })
        .attr("y", function(player) { return trajectory_y(player.last_vote)-5; })
        .on("mouseover", function(player) {
            if (player._selected) {
                lines[player.Name]
                    .attr("stroke-opacity", 1)
                    .attr("stroke-width", 3);
            }
        })
        .on("mouseout", function(player){ 
            if (player._selected) {
                lines[player.Name]
                    .attr("stroke-opacity", 0.15)
                    .attr("stroke-width", 2);
            }
        })
	.append("svg:title")
        .text(function(player) {
            return player.Name;
        });

    // for (var i=0; i<players.length; ++i) {
    var line = d3.svg.line()
        .x(function(a) { return x(Number(a.Year)); })
        .y(function(a) { return trajectory_y(Number(a["X.vote"].substring(0, a["X.vote"].length-1))); });
        
    box1.selectAll("path")
        .data(players)
        .enter()
        .append("svg:path")
        .attr("d", function(player) { 
            lines[player.Name] = d3.select(this);
            return line(player.Appearances); 
        })
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.15)
        .attr("fill", "none")
        .on("mouseover", function(player) {
            if (player._selected) {
                d3.select(this)
                    .attr("stroke-opacity", 1)
                    .attr("stroke-width", 3);
            }
        })
        .on("mouseout", function(player) {
            if (player._selected) {
                d3.select(this)
                    .attr("stroke-opacity", 0.15)
                    .attr("stroke-width", 2);
            }
        })
        .append("svg:title")
        .text(function(player) {
            return player.Name;
        });
    
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

    var name_box_value = "";
    function name_query(d) {
        return name_box_value === "" || (d._lowercase_name.indexOf(name_box_value) !== -1);
    }

    var method_query_value = 0;
    function method_query(d) {
        var method = d.Appearances[d.Appearances.length-1].method;
        return method_query_value === 0 || ((1 << Number(method)) & method_query_value);
    }

    var positions = [
        "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "OF", "DH", "Manager"
    ];
    var position_mask = {};
    for (i=0; i<positions.length; ++i)
        position_mask[positions[i]] = 1 << i;

    var position_query_value = 0;
    function position_query(d) {
        var position = position_mask[d.position];
        return position_query_value === 0 || (position & position_query_value);
    }

    var query_list = [name_query, method_query, position_query];

    //////////////////////////////////////////////////////////////////////////
    // induction legend

    var induction_legend = d3.select("#induction_legend").append("svg")
        .attr("width", (width / 10) * 1.5)
        .attr("height", margin.top + height + margin.bottom);

    var induction_legend_items = induction_legend.selectAll("g")
        .data(["Not yet inducted",
               "BBWAA >75%",
               "Special",
               "BBWAA Runoff",
               "Veteran's Committee",
               "Negro Leagues Committee"])
        .enter()
        .append("g");

    var induction_legend_y = d3.scale.linear()
        .domain([0, 6])
        .range([margin.top, margin.top + 6 * 20]);

    var induction_legend_rects, induction_legend_texts;
    function update_induction_legend_query(d, i) {
        method_query_value = method_query_value ^ (1 << i);
        refresh_query();
        induction_legend_rects.transition()
            .attr("fill-opacity", function(d, i) { 
                return (method_query_value === 0 || ((1 << i) & method_query_value)) ?
                    1.0 : 0.2;
            });
        induction_legend_texts.transition()
            .attr("fill-opacity", function(d, i) { 
                return (method_query_value === 0 || ((1 << i) & method_query_value)) ?
                    1.0 : 0.2;
            });
    }
    induction_legend_items.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("x", 5)
        .attr("y", function(d, i) { return induction_legend_y(i); })
        .attr("stroke", "none")
        .style("cursor", "pointer")
        .attr("fill", function(d, i) { return colors(i); })
        .attr("fill-opacity", 1)
        .on("click", update_induction_legend_query);

    induction_legend_items.append("text")
        .text(function(d) { return d; })
        .attr("x", 18)
        .attr("y", function(d, i) { return induction_legend_y(i) + 10; })
        .style("cursor", "pointer")
        .attr("fill-opacity", 1)
        .on("click", update_induction_legend_query);

    induction_legend_rects = induction_legend.selectAll("rect");
    induction_legend_texts = induction_legend.selectAll("text");

    //////////////////////////////////////////////////////////////////////////
    // position legend

    var position_legend = d3.select("#position_legend").append("svg")
        .attr("width", (width / 10) * 0.5)
        .attr("height", margin.top + height + margin.bottom);

    var position_legend_items = position_legend.selectAll("g")
        .data(positions)
        .enter()
        .append("g");

    var position_legend_y = d3.scale.linear()
        .domain([0, positions.length])
        .range([margin.top, margin.top + positions.length * 20]);

    var position_legend_rects, position_legend_texts;
    function update_position_legend_query(d, i) {
        position_query_value = position_query_value ^ (1 << i);
        refresh_query();
        position_legend_rects.transition()
            .attr("fill-opacity", function(d, i) { 
                return (position_query_value === 0 || ((1 << i) & position_query_value)) ?
                    1.0 : 0.2;
            });
        position_legend_texts.transition()
            .attr("fill-opacity", function(d, i) { 
                return (position_query_value === 0 || ((1 << i) & position_query_value)) ?
                    1.0 : 0.2;
            });
    }
    position_legend_items.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("x", 5)
        .attr("y", function(d, i) { return position_legend_y(i); })
        .attr("stroke", "none")
        .style("cursor", "pointer")
        .attr("fill", "black")
        .attr("fill-opacity", 1)
        .on("click", update_position_legend_query);

    position_legend_items.append("text")
        .text(function(d) { return d; })
        .attr("x", 18)
        .attr("y", function(d, i) { return position_legend_y(i) + 10; })
        .style("cursor", "pointer")
        .attr("fill-opacity", 1)
        .on("click", update_position_legend_query);

    position_legend_rects = position_legend.selectAll("rect");
    position_legend_texts = position_legend.selectAll("text");

    function refresh_query() {
        function query(d) {
            for (var i=0; i<query_list.length; ++i)
                if (!query_list[i](d))
                    return false;
            return true;
        }

        box2.selectAll("rect")
            .style("display", function(d) {
                var r = query(d);
                d._selected = r;
                return "inline";
            })
            .transition()
            .attr("fill-opacity", function(d) {
                return d._selected ? 1.0 : 0.0;
            }).attr("stroke-opacity", function(d) {
                return d._selected ? 1.0 : 0.0;
            })
            .transition()
            .duration(0)
            .style("display", function(d) {
                return d._selected ? "inline" : "none";
            })
        ;
        box1.selectAll("path")
            .style("display", function(d) {
                var r = query(d);
                d._selected = r;
                return "inline";
            })
            .transition()
            .attr("stroke-opacity", function(d) {
                return d._selected ? 0.15 : 0.0;
            })
            .transition()
            .duration(0)
            .style("display", function(d) {
                return d._selected ? "inline" : "none";
            })
        ;
    }

    $("#searchbox").bind("input", function(event) {
        name_box_value = event.target.value.toLowerCase();
        refresh_query();
    });

    $("#show-trajectory").click(function() {
        box2.selectAll("rect")
            .transition()
            .duration(1000)
            .attr("y", function(d) { return trajectory_y(d.last_vote)-5; })
            .attr("stroke", "none")
            .attr("width", 10)
            .attr("height", 10)
            .attr("rx", 5)
            .attr("ry", 5)
        ;
    });

    $("#show-histogram").click(function() {
        box2.selectAll("rect")
            .transition()
            .duration(1000)
            .attr("y", function(d) { return histogram_y(d.histogram_position)-5; })
            .attr("width", x(1) - x(0) - 1)
            .attr("height", histogram_y(0) - histogram_y(1) - 1)
            .attr("stroke", "black")
            .attr("rx", 0)
            .attr("ry", 0)
        ;
    });
});

var width = window.innerWidth * 0.75, height = window.innerHeight * 0.5;
var margin = { top: 20, right: 20, bottom: 40, left: 50 };
var first_year = 1936, last_year = 2013;
var largest_histogram_count = 0;
var players;
var cf, all, war, wars, jaws, jawss, chart, hr, hrs;
var formatNumber = d3.format(",d");

function create_vis(players)
{
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
    
    for (i=1; i<=9; ++i){
      svg.append("line")
        .attr("x1", x(first_year))
        .attr("x2", x(last_year))
        .attr("y1", trajectory_y(i*10))
        .attr("y2", trajectory_y(i*10))
        .attr("stroke", "white");
    }

    for (i=1; i<=8; ++i){
      svg.append("line")
        .attr("x1", x(i*10+1930))
        .attr("x2", x(i*10+1930))
        .attr("y1", trajectory_y(0))
        .attr("y2", trajectory_y(100))
        .attr("stroke", "white");
    }

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
	    var la = player.Stats.method;
            return colors(Number(la));
	})
        .attr("stroke", "none")
        .attr("x", function(player) { return x(player.last_appearance)-5; })
        .attr("y", function(player) { 
            return trajectory_y(player.last_vote)-5; 
        })
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
        .y(function(a) { 
            var t = Number(a["pct"]);
            if (isNaN(t)) t = 100; // only happens for Lou Gehrig;
            return trajectory_y(t); 
        });
    
    box1.selectAll("path")
        .data(players)
        .enter()
        .append("svg:path")
        .attr("d", function(player) { 
            lines[player.Name] = d3.select(this);
            var x = line(player.Appearances); 
            if (x.indexOf("NaN") !== -1) {
                debugger;
            }
            return x;
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
        var method = d.Stats.method;
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
               "BBWAA > 75%",
               "BBWAA Special Election",
               "BBWAA Runoff Election",
               "Veterans Committee",
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
}

// from github.com/square/crossfilter
function barChart() {
    if (!barChart.id) barChart.id = 0;

    var margin = {top: 10, right: 10, bottom: 10, left: 50},
        x,
        y = d3.scale.linear().range([0, 100]),
        id = barChart.id++,
        axis = d3.svg.axis().orient("left"),
        brush = d3.svg.brush(),
        brushDirty,
        dimension,
        group,
        round;

    function chart(div) {
        var width = x.range()[1],
            height = y.range()[1];

        y.domain([0, group.top(1)[0].value]);

        div.each(function() {
            var div = d3.select(this),
                g = div.select("g");

            // Create the skeletal chart.
            if (g.empty()) {
                div.select(".title").append("a")
                    .attr("href", "javascript:reset(" + id + ")")
                    .attr("class", "reset")
                    .text("reset")
                    .style("display", "none");

                g = div.append("svg")
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                g.append("clipPath")
                    .attr("id", "clip-" + id)
                    .append("rect")
                    .attr("width", width)
                    .attr("height", height);

                g.selectAll(".bar")
                    .data(["background", "foreground"])
                    .enter().append("path")
                    .attr("class", function(d) { return d + " bar"; })
                    .datum(group.all());

                g.selectAll(".foreground.bar")
                    .attr("clip-path", "url(#clip-" + id + ")");

                g.append("g")
                    .attr("class", "axis")
                    // .attr("transform", "translate(0," + height + ")")
                    .call(axis);

                // Initialize the brush component with pretty resize handles.
                var gBrush = g.append("g").attr("class", "brush").call(brush);
                gBrush.selectAll("rect").attr("height", height);
                gBrush.selectAll(".resize").append("path").attr("d", resizePath);
            }

            // Only redraw the brush if set externally.
            if (brushDirty) {
                brushDirty = false;
                g.selectAll(".brush").call(brush);
                div.select(".title a").style("display", brush.empty() ? "none" : null);
                if (brush.empty()) {
                    g.selectAll("#clip-" + id + " rect")
                        .attr("x", 0)
                        .attr("width", width);
                } else {
                    var extent = brush.extent();
                    g.selectAll("#clip-" + id + " rect")
                        .attr("x", x(extent[0]))
                        .attr("width", x(extent[1]) - x(extent[0]));
                }
            }

            g.selectAll(".bar").attr("d", barPath);
        });

        function barPath(groups) {
            var path = [],
            i = -1,
            n = groups.length,
            d;
            while (++i < n) {
                d = groups[i];
                path.push("M0,", x(d.key), "H", y(d.value), "v9H0");
            }
            return path.join("");
        }

        function resizePath(d) {
            var e = +(d == "n"),
            x = e ? 1 : -1,
            y = height / 3;
            return "M" + (.5 * x) + "," + y
                + "A6,6 0 0 " + e + " " + (6.5 * x) + "," + (y + 6)
                + "V" + (2 * y - 6)
                + "A6,6 0 0 " + e + " " + (.5 * x) + "," + (2 * y)
                + "Z"
                + "M" + (2.5 * x) + "," + (y + 8)
                + "V" + (2 * y - 8)
                + "M" + (4.5 * x) + "," + (y + 8)
                + "V" + (2 * y - 8);
        }
    }

    brush.on("brushstart.chart", function() {
        var div = d3.select(this.parentNode.parentNode.parentNode);
        div.select(".title a").style("display", null);
    });

    brush.on("brush.chart", function() {
        var g = d3.select(this.parentNode),
        extent = brush.extent();
        if (round) g.select(".brush")
            .call(brush.extent(extent = extent.map(round)))
            .selectAll(".resize")
            .style("display", null);
        g.select("#clip-" + id + " rect")
            .attr("x", x(extent[0]))
            .attr("width", x(extent[1]) - x(extent[0]));
        dimension.filterRange(extent);
    });

    brush.on("brushend.chart", function() {
        if (brush.empty()) {
            var div = d3.select(this.parentNode.parentNode.parentNode);
            div.select(".title a").style("display", "none");
            div.select("#clip-" + id + " rect").attr("x", null).attr("width", "100%");
            dimension.filterAll();
        }
    });

    chart.margin = function(_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
    };

    chart.x = function(_) {
        if (!arguments.length) return x;
        x = _;
        axis.scale(x);
        brush.x(x);
        return chart;
    };

    chart.y = function(_) {
        if (!arguments.length) return y;
        y = _;
        return chart;
    };

    chart.dimension = function(_) {
        if (!arguments.length) return dimension;
        dimension = _;
        return chart;
    };

    chart.filter = function(_) {
        if (_) {
            brush.extent(_);
            dimension.filterRange(_);
        } else {
            brush.clear();
            dimension.filterAll();
        }
        brushDirty = true;
        return chart;
    };

    chart.group = function(_) {
        if (!arguments.length) return group;
        group = _;
        return chart;
    };

    chart.round = function(_) {
        if (!arguments.length) return round;
        round = _;
        return chart;
    };

    return d3.rebind(chart, brush, "on");
}

d3.csv("player_data.csv", function(error, player_csv) {
    d3.csv("election_data.csv", function(error, election_csv) {
        players = create_players(player_csv, election_csv);

        cf = crossfilter(player_csv);
        all = cf.groupAll();

        war = cf.dimension(function(d) { return Number(d.WAR); });
        wars = war.group(function(d) {
            return Math.floor((d + 6.7) / 16) * 16;
        });

        jaws = cf.dimension(function(d) { 
            var t = Number(d.JAWS); 
            return (isNaN(t)) ? undefined : t; 
        });
        jawss = jaws.group(function(d) {
            return Math.floor((d + 2.6) / 13) * 13;
        });

        hr = cf.dimension(function(d) { 
            var t = Number(d.HR); 
            return (isNaN(t)) ? 0 : t; 
        }); 
        hrs = hr.group(function(d) {
            return Math.floor(d / 76) * 76;
        });
        
        create_vis(players);

        window.filter = function(filters) {
            filters.forEach(function(d, i) { charts[i].filter(d); });
            renderAll();
        };

        window.reset = function(i) {
            charts[i].filter(null);
            renderAll();
        };

        function render(method) {
            d3.select(this).call(method);
        }

        function renderAll() {
            chart.each(render);
            // list.each(render);
            d3.select("#active").text(formatNumber(all.value()));
        }

        var charts = [];
        var dimensions = [];
        var groups = [];

        var stats = ["HOFm", "HOFs", "Yrs", "WAR", "WAR7", "JAWS", "Jpos", "G", "AB", "R", "H", "HR", "RBI", "SB", "BB", "BA", "OBP", "SLG", "OPS", "OPS.Plus", "W", "L", "ERA", "ERA.Plus"];
        _.each(stats, function(stat) {
            var select = function(d) {
                return Number(d[stat]);
            };
            var dimension = cf.dimension(select);
            var vs = _.map(player_csv, select);
            var min = d3.min(vs), max = d3.max(vs), range = max - min;
            var group = dimension.group(function(d) {
                var t = (d - min) / range * 10;
                return Math.floor(t) * range / 10 + min;
            });
            dimensions.push(dimension);
            groups.push(group);
            var c = barChart()
                        .dimension(dimension)
                        .group(group)
                        .x(d3.scale.linear()
                           .domain([min, max])
                           .range([0, 10 * 10]));
            c._stat = stat;
            charts.push(c);
        });

        d3.select("#charts")
            .selectAll(".chart")
            .data(charts)
            .enter()
            .append("div")
            .attr("id", function(d) { return d._stat + "-chart"; })
            .attr("class", "chart")
            .append("div")
            .attr("class", "title")
            .text(function(d) { return d._stat; });

        var chart = d3.selectAll(".chart")
            .data(charts)
            .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });
        renderAll();

    });
});

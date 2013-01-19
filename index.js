var width = window.innerWidth * 0.75, height = window.innerHeight * 0.5;
var margin = { top: 20, right: 20, bottom: 40, left: 50 };
var first_year = 1936, last_year = 2013;
var cf, all, chart;
var formatNumber = d3.format(",d");
var player_dots;
var player_paths;
var induction_method_dimension, player_position_dimension, name_dimension;
var last_year_dimension, last_vote_dimension;
var clicked_player;
var charts = [];
var dimensions = [];
var groups = [];
var lines = {};
var dots = {};

function highlight_on(player)
{
    dots[player.Name].attr("stroke", "black").attr("stroke-width", 2);
    lines[player.Name].attr("stroke-opacity", 1).attr("stroke-width", 3);
}

function highlight_off(player)
{
    dots[player.Name].attr("stroke", "none").attr("stroke-width", 0);
    lines[player.Name].attr("stroke-opacity", 0.15).attr("stroke-width", 2);
}

function toggle_player(player)
{
    var lst = ["Name", "Pos", "Yrs", "G", "WAR", "W", "L", "ERA", "WHIP", "GS", "SV", "IP", "H.1", "HR.1", "BB.1", "SO",
               "AB", "R", "H", "HR", "RBI", "SB", "BB", "BA", "OBP", "SLG", "OPS", "OPS.Plus"];

    if (clicked_player !== undefined)
        highlight_off(clicked_player);
    if (clicked_player === player) {
        clicked_player = undefined;
        _.each(lst, function(c) {
            document.getElementById("player-"+c).innerHTML = "-";
        });
    } else {
        clicked_player = player;
        highlight_on(clicked_player);
        _.each(lst, function(c) {
            var v = player.Stats[c];
            if (v === undefined)
                v = player[c];
            else if (v === "NA")
                v = "-";
            document.getElementById("player-"+c).innerHTML = v;
        });
    }
    renderAll();
}

function renderAll() {
    chart.each(function(method) { d3.select(this).call(method); });
    d3.select("#active").text(formatNumber(all.value()));
    var selection = dimensions[0].top(Infinity);
    var shown = {};
    for (var i=0; i<selection.length; ++i) {
        shown[selection[i].Name] = 1;
    }
    _.each([player_dots.selectAll("rect"), player_paths.selectAll("path")], function(obj) {
        obj.style("display", function(d) {
            return shown[d.Name] || (d === clicked_player) ? "inline" : "none";
        });
    });
}

function create_vis(obj, player_csv, election_csv)
{
    var players = obj.list;
    var player_map = obj.map;
    var i;

    // enrich player_csv with computed data from players
    _.each(player_csv, function(line) {
        _.each(["first_vote", "last_vote", "min_vote", "max_vote", "first_appearance", "last_appearance"], function(f) {
            line[f] = player_map[line.Name][f];
        });
    });

    cf = crossfilter(player_csv);
    d3.selectAll("#total")
        .text(formatNumber(cf.size()));
    all = cf.groupAll();

    name_dimension = cf.dimension(function(d) { return d.Name.toLowerCase(); });
    induction_method_dimension = cf.dimension(function(d) { return Number(d.method); });
    player_position_dimension = cf.dimension(function(d) { return d.position; });

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
    
    for (i=1; i<=9; ++i){
      svg.append("line")
        .attr("x1", x(first_year))
        .attr("x2", x(last_year))
        .attr("y1", y(i*10))
        .attr("y2", y(i*10))
        .attr("stroke", "white");
    }

    for (i=1; i<=8; ++i){
      svg.append("line")
        .attr("x1", x(i*10+1930))
        .attr("x2", x(i*10+1930))
        .attr("y1", y(0))
        .attr("y2", y(100))
        .attr("stroke", "white");
    }

    var box0 = svg.append("g");
    var box1 = svg.append("g");
    var box2 = svg.append("g");
    
    player_dots = box2;
    player_paths = box1;

    var colors = d3.scale.category10();

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
            dots[player.Name] = d3.select(this);
	    var la = player.Stats.method;
            return colors(Number(la));
	})
        .attr("stroke", "none")
        .attr("x", function(player) { return x(player.last_appearance)-5; })
        .attr("y", function(player) { 
            return y(player.last_vote)-5; 
        })
        .on("click", toggle_player)
        .on("mouseover", highlight_on)
        .on("mouseout", function(player) { 
            if (clicked_player !== player)
                highlight_off(player);
        })
	.append("svg:title")
        .text(function(player) {
            return player.Name;
        });

    var line = d3.svg.line()
        .x(function(a) { return x(Number(a.Year)); })
        .y(function(a) { 
            var t = Number(a["pct"]);
            if (isNaN(t)) t = 100; // only happens for Lou Gehrig;
            return y(t); 
        });
    
    box1.selectAll("path")
        .data(players)
        .enter()
        .append("svg:path")
        .attr("d", function(player) { 
            lines[player.Name] = d3.select(this);
            var x = line(player.Appearances); 
            return x;
        })
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.15)
        .attr("fill", "none")
        .on("click", toggle_player)
        .on("mouseover", highlight_on)
        .on("mouseout", function(player) {
            if (clicked_player !== player)
                highlight_off(player);
        })
        .append("svg:title")
        .text(function(player) {
            return player.Name;
        });

    //////////////////////////////////////////////////////////////////////////

    var brush = d3.svg.brush();
    brush.x(x);
    brush.y(y);
    var gBrush = box0.append("g").attr("class", "brush").call(brush);

    brush.on("brush", function() {
        if (brush.empty()) {
            last_year_dimension.filterAll();
            last_vote_dimension.filterAll();
        } else {
            var extent = brush.extent();
            last_year_dimension.filterRange([extent[0][0], extent[1][0]]);
            last_vote_dimension.filterRange([extent[0][1], extent[1][1]]);        
        }
        renderAll();
    });

    //////////////////////////////////////////////////////////////////////////
    
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
        var method = d.method;
        return method_query_value === 0 || ((1 << Number(method)) & method_query_value);
    }

    var positions = [
        "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "OF", "DH", "Manager", "Batters"
    ];

    var position_mask = {};
    for (i=0; i<positions.length-1; ++i)
        position_mask[positions[i]] = 1 << i;

    position_mask["Batters"] = 
        position_mask["C"] | 
        position_mask["1B"] | 
        position_mask["2B"] | 
        position_mask["3B"] | 
        position_mask["SS"] | 
        position_mask["LF"] | 
        position_mask["CF"] | 
        position_mask["RF"] | 
        position_mask["OF"] | 
        position_mask["DH"];

    var position_query_value = 0;

    //////////////////////////////////////////////////////////////////////////
    // induction legend

    var induction_legend = d3.select("#induction_legend").append("svg")
        .attr("width", (width / 10) * 1.5)
        .attr("height", (margin.top + height + margin.bottom) * 0.23);

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
        .range([5, 5 + 6 * 20]);

    var induction_legend_rects, induction_legend_texts;
    function update_induction_legend_query(d, i) {
        method_query_value = method_query_value ^ (1 << i);
        induction_method_dimension.filter(function(d) {
            return method_query_value === 0 || ((1 << d) & method_query_value);
        });
        renderAll();
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
        .attr("width", (width / 10) * 1.5)
        .attr("height", (margin.top + height + margin.bottom) * 0.6);

    var position_legend_items = position_legend.selectAll("g")
        .data(positions)
        .enter()
        .append("g");

    var position_legend_y = d3.scale.linear()
        .domain([0, positions.length])
        .range([5, 5 + positions.length * 20]);

    var position_legend_rects, position_legend_texts;
    function update_position_legend_query(d, i) {
        position_query_value = position_query_value ^ position_mask[d];
        player_position_dimension.filter(function(d) {
            return position_query_value === 0 || (position_mask[d] & position_query_value);
        });
        renderAll();
        position_legend_rects.transition()
            .attr("fill-opacity", function(d, i) { 
                return (position_query_value === 0 || (position_mask[d] & position_query_value)) ?
                    1.0 : 0.2;
            });
        position_legend_texts.transition()
            .attr("fill-opacity", function(d, i) { 
                return (position_query_value === 0 || (position_mask[d] & position_query_value)) ?
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

    $("#searchbox").bind("input", function(event) {
        name_box_value = event.target.value.toLowerCase();
        name_dimension.filter(function(d) {
            return name_box_value === "" || (d.indexOf(name_box_value) !== -1);
        });
        renderAll();
    });

    window.filter = function(filters) {
        filters.forEach(function(d, i) { charts[i].filter(d); });
        renderAll();
    };

    window.reset = function(i) {
        charts[i].filter(null);
        renderAll();
    };

    var stats = ["Yrs", "G", "WAR", "W", "L", "ERA", "WHIP", "GS", "SV", "IP", "H.1", "HR.1", "BB.1", "SO", 
                 // "AB", "R", 
                 "H", "HR", "RBI", "SB", "BB", "BA", "OBP", "SLG", "OPS",
                 "min_vote", "max_vote", "first_vote", "last_vote", "first_appearance", "last_appearance"];
    var bounds = {
        "ERA": { min: 1.5, max: 5 },
        "SO": { min: 0, max: 3700 },
        "H": { min: 0, max: 3700 },
        "SB": { min: 0, max: 800 },
        "IP": { min: 0, max: 5500 },
        "WHIP": { min: 0.85, max: 1.75 },
        "WAR": { min: 0, max: 125 },
        "BA": { min: 0, max: 0.4 },
        "W": { min: 0, max: 400 },
        "OBP": { min: 0, max: 0.48 },
        "AB": { min: 0, max: 12000 },
        "BB.1": { min: 0, max: 2000 },
        "R": { min: 0, max: 2000 },
        "SV": { min: 0, max: 370 },
        "BB": { min: 0, max: 1900 },
        "H.1": { min: 0, max: 5000 }
    };
    _.each(stats, function(stat) {
        var min, max;
        var select = function(d) {
            var t = Number(d[stat]);
            return isNaN(t) ? Infinity : Math.max(min, Math.min(max, t));
        };
        if (_.isUndefined(bounds[stat])) {
            min = -Infinity;
            max = Infinity;
            var vs = _.map(player_csv, select);
            min = d3.min(vs, function(i) { return (i === Infinity) ? NaN:i; });
            max = d3.max(vs, function(i) { return (i === Infinity) ? NaN:i; });
        } else {
            min = bounds[stat].min;
            max = bounds[stat].max;
        } 
        var range = max - min;
        var dimension = cf.dimension(select);
        var group = dimension.group(function(d) {
            var t = (d - min) / range * 10;
            return Math.floor(t) * range / 10 + min;
        });
        dimensions.push(dimension);
        groups.push(group);
        if (stat === "last_appearance" ||
            stat === "last_vote")
            return;
        var c = barChart()
            .dimension(dimension)
            .group(group)
            .x(d3.scale.linear()
               .domain([min, min + (range * 1.1)])
               .range([0, 10 * 11]));
        c._stat = stat;
        charts.push(c);
    });
    last_vote_dimension = dimensions[26];
    last_year_dimension = dimensions[28];

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

    chart = d3.selectAll(".chart")
        .data(charts)
        .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });
    renderAll();
}

// from github.com/square/crossfilter
function barChart() {
    if (!barChart.id) barChart.id = 0;

    var margin = {top: 10, right: 10, bottom: 20, left: 50},
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

        var g = group.top(2);
        var v;
        for (var i=0; i<2; ++i) {
            if (g[i].key !== Infinity) {
                v = g[i].value;
                break;
            }
        }
        if (_.isUndefined(v))
            throw "internal error";
        y.domain([0, v]);

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
                gBrush.selectAll("rect").attr("width", width);
                gBrush.selectAll(".resize").append("path").attr("d", resizePath);
            }

            // Only redraw the brush if set externally.
            if (brushDirty) {
                brushDirty = false;
                g.selectAll(".brush").call(brush);
                div.select(".title a").style("display", brush.empty() ? "none" : null);
                if (brush.empty()) {
                    g.selectAll("#clip-" + id + " rect")
                        .attr("y", 0)
                        .attr("height", height);
                } else {
                    var extent = brush.extent();
                    g.selectAll("#clip-" + id + " rect")
                        .attr("y", x(extent[0]))
                        .attr("height", x(extent[1]) - x(extent[0]));
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
                if (x(d.key) === Infinity ||
                    y(d.value) === Infinity)
                    continue;
                path.push("M0,", x(d.key), "H", y(d.value), "v9H0");
            }
            return path.join("");
        }

        function resizePath(d) {
            var e = +(d == "s"),
            x = e ? 1 : -1,
            y = width / 3;

            return "M" + y + "," + (.5 * x)
                + "A6,6 0 0 " + (1-e) + " " + (y + 6) + "," + (6.5 * x)
                + "H" + (2 * y - 6)
                + "A6,6 0 0 " + (1-e) + " " + (2 * y) + "," + (.5 * x)
                + "Z"
                + "M" + (y + 8) + "," + (2.5 * x)
                + "H" + (2 * y - 8)
                + "M" + (y + 8) + "," + (4.5 * x)
                + "H" + (2 * y - 8);
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
            .attr("y", x(extent[0]))
            .attr("height", x(extent[1]) - x(extent[0]));
        dimension.filterRange(extent);
    });

    brush.on("brushend.chart", function() {
        if (brush.empty()) {
            var div = d3.select(this.parentNode.parentNode.parentNode);
            div.select(".title a").style("display", "none");
            div.select("#clip-" + id + " rect").attr("y", null).attr("height", "100%");
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
        brush.y(x);
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
        var obj = create_players(player_csv, election_csv);
        create_vis(obj, player_csv, election_csv);
    });
});

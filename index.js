//////////////////////////////////////////////////////////////////////////////
// Seriously, what are you doing in here? This was put together in less than a week!
// Watch the horror at https://github.com/cscheid/mlb-hall-of-fame-voting/

//////////////////////////////////////////////////////////////////////////////
// google analytics

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-19821647-1']);
_gaq.push(['_trackPageview']);
(function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();

//////////////////////////////////////////////////////////////////////////////

var width = window.innerWidth * 0.70, height = window.innerHeight * 0.5;
var margin = { top: 10, right: 20, bottom: 40, left: 50 };
var first_year = 1936, last_year = 2014.1;
var cf, all, chart;
var formatNumber = d3.format(",d");
var player_dots;
var player_paths;
var induction_method_dimension, player_position_dimension, name_dimension;
var last_appearance_dimension, last_vote_dimension;
var clicked_player;
var charts = [];
var dimensions = [];
var groups = [];
var lines = {};
var dots = {};
var player_names = {};
var dimension_filter_map = {};
var trajectory_brush;
var refresh_trajectory_brush;
var redraw_induction_legend_query;
var redraw_position_legend_query;
var _debugging = false;
var scatterplot;

var induction_method_colormap = d3.scale.category10();
induction_method_colormap.domain([0,4,1,3,5,2,6,7]);

//////////////////////////////////////////////////////////////////////////////
// https://groups.google.com/forum/?fromgroups=#!searchin/d3-js/scope/d3-js/eUEJWSSWDRY/XWKLd3QuaAoJ

d3.selection.prototype.moveToFront = function() {
    return this.each(function() {
        this.parentNode.appendChild(this);
    });
};

//////////////////////////////////////////////////////////////////////////////
// http://stackoverflow.com/questions/4801655/how-to-go-to-a-specific-element-on-page

(function($) {
    $.fn.goTo = function() {
        $('html, body').animate({
            scrollTop: $(this).offset().top + 'px'
        }, 'fast');
        return this; // for chaining...
    };
})(jQuery);

//////////////////////////////////////////////////////////////////////////////
// which stats to search, their names, etc.

var stats = ["Yrs", "G", "WAR", "mitchell.report",  // All
             "W", "L", "ERA", "WHIP", "SV", "IP", "BB.1", "SO",  // Pitcher
             // "AB", "R", 
             "H", "R", "HR", "RBI", "SB", "BB", "BA", "OBP", "SLG", "OPS", // Batter
             "min_vote", "max_vote", "first_vote", "last_vote", "first_appearance", "last_appearance", "Num.Years.On.Ballot" // All
            ];

var hist_title = {
    "Yrs": "Years",
    "H.1": "H&nbsp;(allowed)",
    "HR.1": "HR&nbsp;(allowed)",
    "BB.1": "BB&nbsp;(allowed)",
    "min_vote": "min.&nbsp;%",
    "max_vote": "max.&nbsp;%",
    "first_vote": "first&nbsp;%",
    "last_vote": "last&nbsp;%",
    "first_appearance": "first&nbsp;yr.&nbsp;on&nbsp;ballot",
    "last_appearance": "last&nbsp;yr.&nbsp;on&nbsp;ballot",
    "Num.Years.On.Ballot": "Yrs.&nbsp;on&nbsp;ballot",
    "mitchell.report": "Mitchell"
};

function stats_name(d)
{
    return hist_title[d] || d;
}

var format_stat_map = {
    "ERA": d3.format("0.2f"),
    "WHIP": d3.format("0.2f"),
    "BA": function(i) { return d3.format(".3f")(i).substring(1); },
    "OBP": function(i) { return d3.format(".3f")(i).substring(1); },
    "SLG": function(i) { return d3.format(".3f")(i).substring(1); },
    "OPS": d3.format("0.3f"),
    "IP": d3.format(".1f"),
    "WAR": d3.format(".1f")
};

function format_stat(key, v)
{
    return v === "-" ? "-" : ((format_stat_map[key] || function(i) { return i; })(v));
}

//////////////////////////////////////////////////////////////////////////////
// state serialization

function fresh_vis_state()
{
    var lst = _.map(["WAR", "HR", "H", "W", "SO", "BA"],
          function(i) { return stats.indexOf(i); });
    lst.unshift(-1); // this jquery serialization sucks. If list is empty, we get no entry under the given key.

    return { 
        shown_histograms: lst
    };
}

var vis_state = fresh_vis_state();

function state_url()
{
    return location.origin + location.pathname + 
        "#state=" + $.param({ state: vis_state });
}

function save_vis_state(replace)
{
    if (replace)
        history.replaceState(vis_state, "Query", state_url());
    else
        history.pushState(vis_state, "Query", state_url());
}

function vis_state_updater(brush, query_key_accessor, brush_state_accessor) {
    return function() {
        var query_key = query_key_accessor();
        if (brush.empty()) {
            delete vis_state[query_key];
        } else {
            vis_state[query_key] = brush_state_accessor();
        }
        history.replaceState(vis_state, "Query", state_url());
    };
}

//////////////////////////////////////////////////////////////////////////////
// scatterplot

function change_scatterplot_x_axis()
{
    scatterplot.x_stat(stats[document.getElementById("scatterplot-x-axis").selectedIndex]);
}

function change_scatterplot_y_axis()
{
    scatterplot.y_stat(stats[document.getElementById("scatterplot-y-axis").selectedIndex]);
}

function create_scatterplot(player_list)
{
    var w, h, margin_bottom = 40, margin_left = 40, margin_top = 5, margin_right = 5;

    var svg = d3.select("#scatterplot")
        .append("svg")
        .attr("id", "scatterplot-svg")
        .attr("width", "100%");
    w = document.getElementById("scatterplot-svg").clientWidth - margin_left - margin_right;
    h = w;

    svg = svg.attr("height", margin_bottom + h + margin_top)
        .append("g")
        .attr("transform", "translate(" + margin_left + "," + margin_top + ")");
    svg
        .append("rect")
        .attr("width", w)
        .attr("height", h)
        .attr("fill", "black")
        .attr("fill-opacity", 0.1);

    var x_scale = d3.scale.linear()
        .domain([0, 1])
        .range([0, w]);

    var y_scale = d3.scale.linear()
        .domain([0, 1])
        .range([h, 0]);

    var xAxis = d3.svg.axis();
    var yAxis = d3.svg.axis();
    xAxis.ticks(3);
    yAxis.ticks(3);

    xAxis.scale(x_scale).tickFormat(d3.format("d"));
    yAxis.scale(y_scale).tickFormat(d3.format("d"));

    xAxis.orient("bottom");
    var xaxis_g = svg.append("g")
        .attr("transform", "translate(0," + h + ")")
        .attr("class", "axis");

    yAxis.orient("left");
    var yaxis_g = svg.append("g")
        .attr("transform", "translate(0,0)")
        .attr("class", "axis");

    var x_text = svg.append("text")
	.attr("class", "x smalllabel")
	.attr("text-anchor", "middle")
	.attr("x", w/2)
	.attr("y", h+30);
    x_text.text("H");

    var y_text = svg.append("text")
	.attr("class", "y smalllabel")
	.attr("text-anchor", "middle")
        .attr("transform", "rotate(-90, 0, " + h + ")")
	.attr("x", w/2)
	.attr("y", h-20);
    y_text.text("BB");

    var player_dots = svg.selectAll("circle")
        .data(player_list);

    var x_stat = "H", y_stat = "BB";

    x_scale.domain([d3.min(player_list, function(d) { return d.Stats[x_stat]; }),
                    d3.max(player_list, function(d) { return d.Stats[x_stat]; })]);
    y_scale.domain([d3.min(player_list, function(d) { return d.Stats[y_stat]; }),
                    d3.max(player_list, function(d) { return d.Stats[y_stat]; })]);

    var player_dots_by_name = {};

    player_dots.enter()
        .append("circle")
        .attr("r", 2)
        .each(function(player) {
            player_dots_by_name[player.Name] = d3.select(this);
        })
        .style("fill", function(d) {
            return induction_method_colormap(Number(d.Stats.method));
        })
        .style("cursor", "pointer")
        .on("click", toggle_player)
        .on("mouseover", highlight_on)
        .on("mouseout", function(player) { 
            if (clicked_player !== player)
                highlight_off(player);
        })
        .attr("cx", function(d) { 
            if (isNaN(d.Stats[x_stat]))
                return -100;
            return x_scale(d.Stats[x_stat]);
        })
        .attr("cy", function(d) { 
            if (isNaN(d.Stats[y_stat]))
                return -100;
            return y_scale(d.Stats[y_stat]); 
        })
	.append("svg:title")
        .text(function(player) {
            return player.Name;
        })
    ;
    xaxis_g.call(xAxis);
    yaxis_g.call(yAxis);

    var x_dropdown = d3.select("#scatterplot-x-axis")
        .selectAll("option")
        .data(stats);
    x_dropdown.enter()
        .append("option")
        .text(function(d) { return stats_name(d).replace(/&nbsp;/g, " "); });

    var y_dropdown = d3.select("#scatterplot-y-axis")
        .selectAll("option")
        .data(stats);
    y_dropdown.enter()
        .append("option")
        .text(function(d) { return stats_name(d).replace(/&nbsp;/g, " "); });

    document.getElementById("scatterplot-x-axis").selectedIndex = stats.indexOf("H");
    document.getElementById("scatterplot-y-axis").selectedIndex = stats.indexOf("BB");

    return {
        player_dots_by_name: player_dots_by_name,
        player_dots: player_dots,
        x_stat: function(stat) {
            x_scale.domain([d3.min(player_list, function(d) { return Number(d.Stats[stat]); }),
                            d3.max(player_list, function(d) { return Number(d.Stats[stat]); })]);
            player_dots
                .attr("display", function(d) {
                    return isNaN(d.Stats[x_stat])?"none":null;
                })
                .attr("cx", function(d) {
                    if (isNaN(d.Stats[stat]))
                        return -100;
                    return x_scale(d.Stats[stat]); 
                });
            x_stat = stat;
            player_dots
                .attr("display", function(d) {
                    return isNaN(d.Stats[x_stat])?"none":null;
                });
            xaxis_g.call(xAxis);
            x_text.text(stat);
        },
        y_stat: function(stat) {
            y_scale.domain([d3.min(player_list, function(d) { return Number(d.Stats[stat]); }),
                            d3.max(player_list, function(d) { return Number(d.Stats[stat]); })]);
            player_dots
                .attr("display", function(d) {
                    return isNaN(d.Stats[y_stat])?"none":null;
                })
                .attr("cy", function(d) {
                    if (isNaN(d.Stats[stat]))
                        return -100;
                    return y_scale(d.Stats[stat]); 
                });
            y_stat = stat;
            player_dots
                .attr("display", function(d) {
                    return isNaN(d.Stats[y_stat])?"none":null;
                });
            yaxis_g.call(yAxis);
            y_text.text(stat);
        }
    };
}

//////////////////////////////////////////////////////////////////////////////

function replace_queries()
{
    _.each(dimensions, function(dim) {
        dim.filterAll();
    });
    dimension_filter_map.induction_method(0);
    dimension_filter_map.position(0);

    _.each(vis_state, function(v, k) {
        if (k in dimension_filter_map)
            dimension_filter_map[k](v);
    });
}

function update_brushes()
{
    _.each(charts, function(chart) {
        var v = vis_state[chart.query_key()];
        chart.brush().clear();
        if (!_.isUndefined(v)) {
            chart.brush().extent(v);
        }
        chart.refresh_brush();
    });

    // trajectory brush
    if (vis_state.last_appearance) {
        trajectory_brush.extent([[vis_state.last_appearance[0], vis_state.last_vote[0]],
                                 [vis_state.last_appearance[1], vis_state.last_vote[1]]]);
    } else {
        trajectory_brush.clear();
    }
    refresh_trajectory_brush();

    // induction method brushes
    redraw_induction_legend_query();
    redraw_position_legend_query();
}

function sync_to_vis_state() {
    replace_queries();
    update_brushes();
    for (var i=0; i<27; ++i) {
        window.hide(i, true);
    }
    for (var k in vis_state.shown_histograms) {
        window.show(vis_state.shown_histograms[k], true);
    }
    renderAll();
}

function highlight_on(player)
{
    dots[player.Name].attr("stroke", "black").attr("stroke-width", 2).moveToFront();
    player_names[player.Name].attr("display", null).moveToFront();
    lines[player.Name].attr("stroke-opacity", 1).attr("stroke-width", 3).moveToFront();
    scatterplot.player_dots_by_name[player.Name].attr("stroke", "black").attr("stroke-width", 2).attr("r", 5).moveToFront();
}

function highlight_off(player)
{
    dots[player.Name].attr("stroke", "none").attr("stroke-width", 0);
    player_names[player.Name].attr("display", "none");
    lines[player.Name].attr("stroke-opacity", 0.15).attr("stroke-width", 2);
    scatterplot.player_dots_by_name[player.Name].attr("stroke", "none").attr("stroke-width", 0).attr("r", 2);
}

function toggle_player(player)
{
    var lst = ["Name", "Pos", "Yrs", "G", "WAR", "W", "L", "ERA", "WHIP", "GS", "SV", "IP", "H.1", "HR.1", "BB.1", "SO",
               "AB", "R", "H", "HR", "RBI", "SB", "BB", "BA", "OBP", "SLG", "OPS"];
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
            document.getElementById("player-"+c).innerHTML = format_stat(c, v);
        });
    }
    renderAll();
}

function renderAll() {
    chart.each(function(method) { d3.select(this).call(method); });
    var selection = dimensions[0].top(Infinity);
    var shown = {};
    for (var i=0; i<selection.length; ++i) {
        shown[selection[i].Name] = 1;
    }
    var count = 0;
    player_dots.selectAll("rect").each(function(d) {
        count += ~~(shown[d.Name] || (d === clicked_player));
    });

    _.each([player_dots.selectAll("rect"), 
            player_paths.selectAll("path"), 
            scatterplot.player_dots], function(obj) {
        obj.style("display", function(d) {
            var v = shown[d.Name] || (d === clicked_player);
            return v ? "inline" : "none";
        });
    });
    d3.select("#active").text(formatNumber(count));
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

    var q = box2.selectAll("rect")
        .data(players)
        .enter();
    q
        .append("rect")
        .style("cursor", "pointer")
        .attr("fill-opacity", 1)
        .attr("rx", 5)
        .attr("ry", 5)
        .attr("width", 10)
        .attr("height", 10)
        .each(function(player) {
            dots[player.Name] = d3.select(this);
        })
	.attr("fill", function(player) {
	    var la = player.Stats.method;
            return induction_method_colormap(Number(la));
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
        });

    var player_name = q
        .append("g")
        .attr("display", "none")
        .each(function(player) {
            player_names[player.Name] = d3.select(this);
        });

    player_name
        .append("text")
        .attr("x", function(player) { 
            var s = player.last_appearance > 1975 ? -1 : 1;
            if (y(player.last_vote)-5 < 20) return x(player.last_appearance) + 15 * s; else return x(player.last_appearance)-5 * s; 
        })
        .attr("y", function(player) { return Math.max(y(player.last_vote)-5, 20); })
        .attr("class", "player-name-background")
        .attr("text-anchor", function(player) {
            if (player.last_appearance > 1975)
                return "end";
            else
                return "start";
        })
        .text(function(player) { return player.Name; })
        .attr("stroke", "white")
        .attr("stroke-width", "4px");

    player_name
        .append("text")
        .attr("x", function(player) { 
            var s = player.last_appearance > 1975 ? -1 : 1
            if (y(player.last_vote)-5 < 20) return x(player.last_appearance) + 15 * s; else return x(player.last_appearance)-5 * s; 
        }) // return x(player.last_appearance)-5; })
        .attr("y", function(player) { return Math.max(y(player.last_vote)-5, 20); })
        .attr("class", "smalllabel")
        .attr("text-anchor", function(player) {
            if (player.last_appearance > 1975)
                return "end";
            else
                return "start";
        })
        .text(function(player) { return player.Name; })    
;

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
        .style("cursor", "pointer")
        .on("click", toggle_player)
        .on("mouseover", highlight_on)
        .on("mouseout", function(player) {
            if (clicked_player !== player)
                highlight_off(player);
        });

    //////////////////////////////////////////////////////////////////////////

    var brush = d3.svg.brush();
    brush.x(x);
    brush.y(y);
    trajectory_brush = brush;
    var gBrush = box0.append("g").attr("class", "brush").call(brush);
    refresh_trajectory_brush = function() {
        gBrush.call(brush);
    };

    brush.on("brush", function() {
        if (brush.empty()) {
            last_appearance_dimension.filterAll();
            last_vote_dimension.filterAll();
            delete vis_state.last_appearance;
            delete vis_state.last_vote;
        } else {
            var extent = brush.extent();
            last_appearance_dimension.filterRange([extent[0][0], extent[1][0]]);
            last_vote_dimension.filterRange([extent[0][1], extent[1][1]]);
            vis_state.last_appearance = [extent[0][0], extent[1][0]];
            vis_state.last_vote = [extent[0][1], extent[1][1]];
        }
        renderAll();
        history.replaceState(vis_state, "Query", state_url());
    });

    brush.on("brushstart", function() {
        if (brush.empty()) {
            delete vis_state.last_appearance;
            delete vis_state.last_vote;
        } else {
            var extent = brush.extent();
            vis_state.last_appearance = [extent[0][0], extent[1][0]];
            vis_state.last_vote = [extent[0][1], extent[1][1]];
        }
        save_vis_state();
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
	.attr("x", -height/2 + margin.left + 50)
	.attr("y", margin.top + 10)
	.attr("transform", "rotate(-90)")
	.text("Percentage of BBWAA Ballots");

    var name_box_value = "";
    function name_query(d) {
        return name_box_value === "" || (d._lowercase_name.indexOf(name_box_value) !== -1);
    }

    var positions = [
        "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "OF", "DH", "MGR", "Batters"
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

    var method_query_value = 0;
    var position_query_value = 0;

    dimension_filter_map.induction_method = function(v) {
        method_query_value = v;
    };
    dimension_filter_map.position = function(v) {
        position_query_value = v;
    };

    //////////////////////////////////////////////////////////////////////////
    // induction legend

    var induction_legend = d3.select("#induction_legend").append("svg")
        .attr("width", (width / 10) * 3.5)
        .attr("height", "120px");

    var induction_legend_items = induction_legend.selectAll("g")
        .data(["Not yet inducted",
               "BBWAA > 75%",
               "BBWAA Special Election",
               "BBWAA Runoff Election",
               "Veterans Committee (Player)",
               "Veterans Committee (Manager)",
               "Veterans Committee (Executive)",
               "Negro Leagues Committee"
              ])
        .enter()
        .append("g");

    var induction_legend_y = d3.scale.linear()
        .domain([0, 6])
        .range([5, 5 + 6 * 14]);

    var induction_legend_rects, induction_legend_texts;

    redraw_induction_legend_query = function() {
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
    };

    function update_induction_legend_query(d, i) {
        method_query_value = method_query_value ^ (1 << i);
        redraw_induction_legend_query();
        if (method_query_value)
            vis_state.induction_method = method_query_value;
        else
            delete vis_state.induction_method;
        save_vis_state();
    }
    induction_legend_items.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("x", 5)
        .attr("y", function(d, i) { return induction_legend_y(i); })
        .attr("stroke", "none")
        .style("cursor", "pointer")
        .attr("fill", function(d, i) { return induction_method_colormap(i); })
        .attr("fill-opacity", 1)
        .on("click", update_induction_legend_query);

    induction_legend_items.append("text")
        .attr("class", "legend-text")
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
        .attr("height", "190px");

    var position_legend_items = position_legend.selectAll("g")
        .data(positions)
        .enter()
        .append("g");

    var position_legend_y = d3.scale.linear()
        .domain([0, positions.length])
        .range([5, 5 + positions.length * 14]);

    var position_legend_rects, position_legend_texts;

    redraw_position_legend_query = function() {
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
    };

    function update_position_legend_query(d, i) {
        position_query_value = position_query_value ^ position_mask[d];
        redraw_position_legend_query();
        if (position_query_value)
            vis_state.position = position_query_value;
        else
            delete vis_state.position;
        save_vis_state();
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
        .attr("class", "legend-text")
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

    window.clear_query = function() {
        save_vis_state();
        var old_histogram = vis_state.shown_histograms;
        vis_state = fresh_vis_state();
        vis_state.shown_histograms = old_histogram;
        sync_to_vis_state();
        save_vis_state(true);
    };

    window.show_default_stats = function() {
        save_vis_state();
        var lst = _.map(["WAR", "HR", "H", "W", "SO", "BA"],
                        function(i) { return stats.indexOf(i); });
        lst.unshift(-1);
        vis_state.shown_histograms = lst;
        sync_to_vis_state();
        save_vis_state(true);
    };

    window.show_common_stats = function() {
        save_vis_state();
        vis_state.shown_histograms = [-1, 0, 1, 2, 3, 22, 23, 24, 26, 28];
        sync_to_vis_state();
        save_vis_state(true);
    };

    window.show_pitcher_stats = function() {
        save_vis_state();
        vis_state.shown_histograms = [-1, 4, 5, 6, 7, 8, 9, 10, 11];
        sync_to_vis_state();
        save_vis_state(true);
    };

    window.show_batter_stats = function() {
        save_vis_state();
        vis_state.shown_histograms = [-1, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
        sync_to_vis_state();
        save_vis_state(true);
    };

    window.filter = function(filters) {
        filters.forEach(function(d, i) { charts[i].filter(d); });
        renderAll();
    };

    window.reset = function(i) {
        charts[i].filter(null);
        renderAll();
    };

    window.hide = function(i, mask_vis_state) {
        if (!mask_vis_state)
            window.reset(i);
        var chart = charts[i];
        if (_.isUndefined(chart))
            return;
        var stat = chart.query_key();
        if (!mask_vis_state) {
            vis_state.shown_histograms = vis_state.shown_histograms.filter(function(d) { return d !== i; });
            save_vis_state();
        }
        d3.select(document.getElementById(stat + "-chart")).style("display", "none");
        d3.select(document.getElementById(stat + "-show")).style("display", null);
        
    };

    window.show = function(i, mask_vis_state) {
        var chart = charts[i];
        if (_.isUndefined(chart))
            return;
        var stat = chart.query_key();
        if (!mask_vis_state && vis_state.shown_histograms.indexOf(i) === -1) {
            vis_state.shown_histograms.push(i);
            save_vis_state();
        }
        d3.select(document.getElementById(stat + "-chart")).style("display", null);
        d3.select(document.getElementById(stat + "-show")).style("display", "none");
    };

    var stat_type_color = ["#000000",
                           "#008080",
                           "#0080FF"];
    var stat_types = [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0, 0];

    var bounds = {
        "ERA": { min: 1.5, max: 5 },
        "SO": { min: 0, max: 3700 },
        "H": { min: 0, max: 3700 },
        "SB": { min: 0, max: 800 },
        "IP": { min: 0, max: 5500 },
        "WHIP": { min: 0.85, max: 1.75 },
        "WAR": { min: 0, max: 125 },
        "BA": { min: 0.200, max: 0.350 },
        "W": { min: 0, max: 400 },
        "OBP": { min: 0.25, max: 0.50 },
        "AB": { min: 0, max: 12000 },
        "BB.1": { min: 0, max: 2000 },
        "R": { min: 0, max: 2000 },
        "SV": { min: 0, max: 370 },
        "BB": { min: 0, max: 1900 },
        "H.1": { min: 0, max: 5000 },
        "Num.Years.On.Ballot": {min: 0, max: 18}
    };

    _.each(stats, function(stat, stat_id) {
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
        dimension_filter_map[stat] = function(v) {
            dimension.filterRange(v);
        };
        groups.push(group);
        if (stat === "last_appearance" ||
            stat === "last_vote")
            return;
        var c = barChart()
            .query_key(stat)
            .dimension(dimension)
            .group(group)
            .x(d3.scale.linear()
               .domain([min + (range * 1.1), min])
               .range([0, 8 * 11]));
        c._stat = stat;
        charts.push(c);
    });
    last_vote_dimension = dimensions[stats.indexOf("last_vote")];
    last_appearance_dimension = dimensions[stats.indexOf("last_appearance")];

    var t = d3.select("#charts")
        .selectAll(".chart")
        .data(charts)
        .enter()
        .append("div")
        .attr("id", function(d) { return d._stat + "-chart"; });

    t.attr("class", "chart")
        .append("div")
        .attr("class", "chart-opts");

    t.append("div")
        .attr("class", "title")
        .style("color", function(d, i) { return stat_type_color[stat_types[i]]; })
        .html(function(d) { return stats_name(d._stat); });

    chart = d3.selectAll(".chart")
        .data(charts)
        .each(function(chart) { chart.on("brush", renderAll).on("brushend", renderAll); });

    scatterplot = create_scatterplot(players);
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
        gBrush,
        brushDirty,
        dimension,
        group,
        round,
        query_key,
        show_span;

    function chart(div) {
        var width = y.range()[1],
            height = x.range()[1];

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
                div.select(".chart-opts")
                    .append("a")
                    .attr("href", "javascript:hide(" + id + ")")
                    .attr("class", "hide")
                    .text("hide");
                
                div.select(".chart-opts").append("a")
                    .attr("href", "javascript:reset(" + id + ")")
                    .attr("class", "reset")
                    .text("reset")
                    .style("display", "none");

                show_span = d3.select("#show");

                show_span
                    .append("span")
                    .attr("id", query_key + "-show")
                    .style("display", "none")
                    .append("a")
                    .attr("href", "javascript:show(" + id + ")")
                    .html(stats_name(query_key)); // hist_title[query_key] || query_key);
                show_span.append("span").text(" ");

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

                axis.ticks(5);

                g.append("g")
                    .attr("class", "axis")
                    // .attr("transform", "translate(0," + height + ")")
                    .call(axis);

                // Initialize the brush component with pretty resize handles.
                gBrush = g.append("g").attr("class", "brush").call(brush);
                gBrush.selectAll("rect").attr("width", width);
                gBrush.selectAll(".resize").append("path").attr("d", resizePath);
            }

            // Only redraw the brush if set externally.
            if (brushDirty) {
                brushDirty = false;
                g.selectAll(".brush").call(brush);
                div.select(".reset").style("display", brush.empty() ? "none" : null);
                if (brush.empty()) {
                    g.selectAll("#clip-" + id + " rect")
                        .attr("y", 0)
                        .attr("height", height);
                } else {
                    var extent = brush.extent();
                    g.selectAll("#clip-" + id + " rect")
                        .attr("y", Math.min(x(extent[1]), x(extent[0])))
                        .attr("height", Math.abs(x(extent[0]) - x(extent[1])));
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
                    y(d.value) === Infinity ||
                    x(d.key) === -Infinity ||
                    y(d.value) === -Infinity)
                    continue;
                path.push("M0,", x(d.key), "H", y(d.value), "v-7H0");
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
        div.select(".reset").style("display", null);
        save_vis_state();
    });

    var update_vis_state = vis_state_updater(
        brush,
        function() { return query_key; },
        function() { return brush.extent(); }
    );

    brush.on("brush.chart", function() {
        update_vis_state();
        var g = d3.select(this.parentNode),
        extent = brush.extent();
        if (round) g.select(".brush")
            .call(brush.extent(extent = extent.map(round)))
            .selectAll(".resize")
            .style("display", null);
        g.select("#clip-" + id + " rect")
            .attr("y", Math.min(x(extent[0]), x(extent[1])))
            .attr("height", Math.abs(x(extent[1]) - x(extent[0])));
        dimension.filterRange(extent);
    });

    brush.on("brushend.chart", function() {
        if (brush.empty()) {
            var div = d3.select(this.parentNode.parentNode.parentNode);
            div.select(".reset").style("display", "none");
            div.select("#clip-" + id + " rect").attr("y", null).attr("height", "100%");
            dimension.filterAll();
        }
    });

    chart.refresh_brush = function() {
        brushDirty = true;
        gBrush.call(brush);
    };

    chart.brush = function() {
        return brush;
    };

    chart.query_key = function(_) {
        if (!arguments.length) return query_key;
        query_key = _;
        return chart;
    };

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
        update_vis_state();
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

$(function() {
    $("#show").css("width", window.innerWidth * 0.70);

     d3.csv("player_data.csv", function(error, player_csv) {
         d3.csv("election_data.csv", function(error, election_csv) {
    //d3.csv("http://s3.amazonaws.com/cscheid-mlb-hall-of-fame-voting/player_data.csv", function(error, player_csv) {
        //d3.csv("http://s3.amazonaws.com/cscheid-mlb-hall-of-fame-voting/election_data.csv", function(error, election_csv) {
            var obj = create_players(player_csv, election_csv);

            create_vis(obj, player_csv, election_csv);

            window.addEventListener("popstate", function(e) {
                vis_state = e.state || $.deparam(location.hash.substr(7), true).state || 
                    fresh_vis_state();
                sync_to_vis_state();
            });

            // _.each([0, 1, 4, 8, 12, 18, 21, 22, 23, 24, 25, 26], function(i) {
            //     window.hide(i);
            // });

            if (location.hash.length > 7) {
                vis_state = $.deparam(location.hash.substr(7), true).state;
            }
            sync_to_vis_state();
            save_vis_state(true);
        });
    });
});

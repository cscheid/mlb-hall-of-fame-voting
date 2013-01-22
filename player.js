function create_player(entry)
{
    for (var k in entry) {
        var t = Number(entry[k]);
        if (!isNaN(t))
            entry[k] = t;
    }
    return {
        Name: entry.Name,
        Pos: entry.position,
        Stats: entry,
        _lowercase_name: entry.Name.toLowerCase(),
        Appearances: []
    };
}

function create_players(csv, csv2) {
    var i;
    var players = {};

    for (i=0; i<csv.length; ++i) {
        var entry = csv[i];
        var player = players[entry.Name];
        if (player === undefined) {
            player = create_player(entry);
            players[player.Name] = player;
        }
    }

    for (i=0; i<csv2.length; ++i) {
        var entry = csv2[i];
        players[entry.Name].Appearances.push(entry);
    } 

    function set_value(p, f, v) {
        var t = Number(v);
        if (isNaN(t))
            p[f] = 100; // only happens for Lou Gehrig
        else
            p[f] = v;
    }
    
    for (var player_name in players) {
        var player = players[player_name];
        player.Appearances.sort(function(a1, a2) {
            a1 = Number(a1.Year);
            a2 = Number(a2.Year);
            return a1 - a2;
        });
        var first_appearance = player.Appearances[0];
        var last_appearance = player.Appearances[player.Appearances.length-1];
        set_value(player, "first_appearance", Number(first_appearance.Year));
        set_value(player, "last_appearance", Number(last_appearance.Year));
        set_value(player, "first_vote", Number(first_appearance.pct));
        set_value(player, "last_vote", Number(last_appearance.pct));
        set_value(player, "min_vote", d3.min(player.Appearances, function(i) { return Number(i.pct); }));
        set_value(player, "max_vote", d3.max(player.Appearances, function(i) { return Number(i.pct); }));
        
        player.position = player.Stats.position;
    }
    var lst = [];
    for (player_name in players) {
        lst.push(players[player_name]);
    };

    return { 
        list: lst,
        map: players
    };
}

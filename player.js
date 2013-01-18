function create_player(entry)
{
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

    for (var player_name in players) {
        var player = players[player_name];
        player.Appearances.sort(function(a1, a2) {
            a1 = Number(a1.Year);
            a2 = Number(a2.Year);
            return a1 - a2;
        });
        var first_appearance = player.Appearances[0];
        var last_appearance = player.Appearances[player.Appearances.length-1];
        player.first_appearance = Number(first_appearance.Year);
        player.last_appearance = Number(last_appearance.Year);
        player.first_vote = Number(first_appearance["pct"]) || 100; // only happens for Lou Gehrig
        player.last_vote = Number(last_appearance["pct"]) || 100; // only happens for Lou Gehrig
        player.position = player.Stats.position;
    }
    var lst = [];
    for (player_name in players) {
        lst.push(players[player_name]);
    };
    players = lst;

    var player_list_copy = players.slice();
    player_list_copy.sort(function(p1, p2) {
        var c = p1.last_appearance - p2.last_appearance;
        if (c) return c;
        c = p1.last_vote - p2.last_vote;
        return c;
    });

    // setup layout for histogram view
    var histogram_position;
    var current_year = 0;
    for (i=0; i<player_list_copy.length; ++i) {
        var player = player_list_copy[i];
        if (current_year !== player.last_appearance) {
            current_year = player.last_appearance;
            histogram_position = 0;
        }
        player.histogram_position = histogram_position++;
        largest_histogram_count = Math.max(largest_histogram_count, histogram_position);
    }

    return players;
}

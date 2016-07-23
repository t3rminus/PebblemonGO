/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var testPos = [49.2359825395677, -123.00481796264647];

var UI = require('ui'),
	ajax = require('ajax'),
	names = require('names'),
	debounce = require('debounce');

var main = new UI.Menu({
	sections: [{
		items: [{
			title: 'Loading...',
			subtitle: 'Please wait'
		}]
	}]
});
main.on('change', function(e) {
	console.log(e);
});
main.show();

var getDistance = function(lat1, lon1, lat2, lon2) {
	var radlat1 = Math.PI * lat1 / 180;
	var radlat2 = Math.PI * lat2 / 180;
	var theta = lon1 - lon2;
	var radtheta = Math.PI * theta / 180;
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist);
	dist = dist * 180 / Math.PI;
	return Math.round(dist * 111189.57696); // To nearest metre
};

var getTime = function(time) {
    time = time - Math.floor(Date.now() / 1000);
    var min = Math.max(Math.floor(time / 60), 0);
    var sec = Math.max(time % 60, 0);
    if(sec < 10) {
        sec = '0' + sec;
    }
    return min + ':' + sec;
};

var pkmn = [],
    dispErr = { title: "Loading", subtitle: "Please wait..." };

function success(pos) {

	var crd = pos.coords;
	if (testPos) {
		crd = {
			latitude: testPos[0],
			longitude: testPos[1]
		};
	}
    
	ajax({
			url: 'https://pokevision.com/map/data/' + crd.latitude + '/' + crd.longitude,
			type: 'json'
		}, function(result) {
			main.selection(function(sel) {
				if (result.status == "success") {
					var tmp = result.pokemon;
					for (var i = 0; i < tmp.length; i++) {
						var pk = tmp[i];
						pk.distance = getDistance(crd.latitude, crd.longitude, pk.latitude, pk.longitude);
						pk.name = names[pk.pokemonId].name;
						pk.color = names[pk.pokemonId].color;
					}
					tmp.sort(function(a, b) {
						return a.distance - b.distance;
					});
					pkmn = tmp;
				} else {
					dispErr = {
        				title: "Error",
        				subtitle: "An unknown error ocurred"
        			};
				}
			});
		},
		function(err) {
			var item = {
				title: "Error",
				subtitle: "An unknown error ocurred"
			};
			if (/maintenance/i.test(err)) {
				item.title = "Maintenance";
				item.subtitle = "Pokévision is offline";
			}
            dispErr = item;
		}
	);
}

function error(err) {
	console.warn('ERROR(' + err.code + '): ' + err.message);
    dispErr = {
        title: "Error",
        subtitle: "An unknown error ocurred"
    };
}

var options = {
	enableHighAccuracy: true,
	timeout: 60000,
	maximumAge: 0
};

setInterval(function() {
    main.selection(function(sel) {
        var items = [];
        if(pkmn.length) {
            for(var i = 0; i < pkmn.length; i++) {
                var pk = pkmn[i];
                var time = getTime(pk.expiration_time);
                if(time != "0:00") {
                    items.push({
                        title: pk.name,
                        icon: 'images/pkmn_' + pk.pokemonId + '.png',
                        subtitle: pk.distance + "m" + '  -  For: ' + time
                    });
                }
            }
        } else {
            items.push(dispErr);
        }
        if (sel.itemIndex > items.length - 1) {
            sel.itemIndex = items.length - 1;
        }
        main.items(0, items);
        main.selection(sel.selectionIndex, sel.itemIndex);
    });
}, 1000);

navigator.geolocation.watchPosition(debounce(6000, success), error, options);

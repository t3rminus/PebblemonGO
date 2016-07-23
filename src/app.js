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
	background: 'black',
	textColor: 'white',
	highlightBackgroundColor: 'white',
	highlightTextColor: 'black',
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

var pkmn = [];

function success(pos) {

	var crd = pos.coords;
	if (testPos) {
		crd = {
			latitude: testPos[0],
			longitude: testPos[1]
		};
	}
	console.log("Got Lat: ", crd.latitude);
	console.log("Got Lon: ", crd.longitude);
	ajax({
			url: 'https://pokevision.com/map/data/' + crd.latitude + '/' + crd.longitude,
			type: 'json'
		}, function(result) {
			main.selection(function(sel) {
				var items = [];
				if (result.status == "success") {
					pkmn = result.pokemon;
					for (var i = 0; i < pkmn.length; i++) {
						var pk = pkmn[i];
						pk.distance = getDistance(crd.latitude, crd.longitude, pk.latitude, pk.longitude);
						pk.name = names[pk.pokemonId].name;
						pk.color = names[pk.pokemonId].color;
					}
					pkmn.sort(function(a, b) {
						return a.distance - b.distance;
					});
					pkmn.forEach(function(pk) {
						items.push({
							title: pk.name,
							icon: 'images/pkmn_' + pk.pokemonId,
							subtitle: pk.distance + "m"
						});
					});
				} else {
					items.push({
						title: "Error",
						subtitle: "An unknown error ocurred"
					});
				}
				if (sel.itemIndex > items.length - 1) {
					sel.itemIndex = items.length - 1;
				}
				main.items(0, items);
				main.selection(sel.selectionIndex, sel.itemIndex);
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
			main.items(0, [item]);
		}
	);
}

function error(err) {
	console.warn('ERROR(' + err.code + '): ' + err.message);
}

var options = {
	enableHighAccuracy: true,
	timeout: 60000,
	maximumAge: 0
};

navigator.geolocation.watchPosition(debounce(6000, success), error, options);

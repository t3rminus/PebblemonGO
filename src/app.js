/**
 * Welcome to Pebble.js!
 *
 * This is where you write your app.
 */

var testPos = [49.2023382, -122.9092728];

var UI = require('ui'),
	Vector2 = require('vector2'),
	ajax = require('ajax'),
	names = require('names'),
	debounce = require('debounce'),
	Feature = require('platform/feature');

var pkmn = [],
	currentLat = 0,
	currentLon = 0,
	jobCounter = 0,
	isUpdating = false,
	dispErr = {
		title: "Loading",
		subtitle: "Please wait..."
	};

var main = new UI.Menu({
	status: {
		backgroundColor: 'black',
		separator: Feature.round('none', 'dotted')
	},
	backgroundColor: 'black',
	textColor: 'white',
	highlightBackgroundColor: Feature.color('#78C850', 'white'),
	highlightTextColor: 'black',
	sections: [{
		items: [{
			title: 'Loading...',
			subtitle: 'Please wait'
		}]
	}]
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
	if (sec < 10) {
		sec = '0' + sec;
	}
	return min + ':' + sec;
};

var getMap = function(lat, lon, id, w, h) {
	return "http://maps.googleapis.com/maps/api/staticmap?format=png8&center=" + lat + "," + lon + "&zoom=16&size=" + w + "x" + h + "&maptype=terrain&sensor=false&markers=icon:http://ugc.pokevision.com/images/pokemon/" + id + ".png|" + lat + "," + lon;
};

var updateMon = function(result) {
	var tmp = result.pokemon;
	for (var i = 0; i < Math.min(tmp.length, 10); i++) {
		var pk = tmp[i];
		pk.distance = getDistance(currentLat, currentLon, pk.latitude, pk.longitude);
		pk.name = names[pk.pokemonId].name;
		pk.color = names[pk.pokemonId].color;
	}
	tmp.sort(function(a, b) {
		return a.distance - b.distance;
	});
	pkmn = tmp;
};

var handleError = function(err) {
	// console.log('Ajax Err');
	var item = {
		title: "Error",
		subtitle: "An unknown error ocurred"
	};
	if (/maintenance/i.test(err)) {
		console.log('Maintenance');
		item.title = "Maintenance";
		item.subtitle = "Pokévision is offline";
	}
	dispErr = item;
	pkmn = null;
};

var handleResult = function(result) {
	if (result.status == 'success') {
		if (result.pokemon) {
			updateMon(result);
			isUpdating = false;
			return;
		} else if (result.jobId) {
			if (jobCounter < 20) {
				jobCounter++;
				setTimeout(function() {
					ajax({
						url: 'https://pokevision.com/map/data/' + currentLat + '/' + currentLon + '/' + result.jobId,
						type: 'json'
					}, handleResult, handleError);
				}, 5000);
				return;
			} else {
				jobCounter = 0;
			}
		}
	}

	dispErr = {
		title: "Error",
		subtitle: "An unknown error ocurred"
	};
	pkmn = null;
	isUpdating = false;
};

function success(pos) {
	if (isUpdating) {
		return;
	}
	isUpdating = true;
	var crd = pos.coords;
	if (testPos) {
		crd.latituide = testPos[0];
		crd.longitude = testPos[1];
	}

	currentLat = crd.latitude;
	currentLon = crd.longitude;

	ajax({
		url: 'https://pokevision.com/map/data/' + crd.latitude + '/' + crd.longitude,
		type: 'json'
	}, handleResult, handleError);
}

function error(err) {
	console.warn('ERROR(' + err.code + '): ' + err.message);
	dispErr = {
		title: "Error",
		subtitle: "An unknown error ocurred"
	};
	pkmn = null;
}

var options = {
	enableHighAccuracy: true,
	timeout: 60000,
	maximumAge: 0
};

setInterval(function() {
	main.selection(function(sel) {
		// console.log('Got Sel');
		var items = [];
		if (Array.isArray(pkmn)) {
			// console.log('Is Arr');
			if (pkmn.length > 0) {
				//console.log('Has Len');
				var keep = [];
				for (var i = 0; i < pkmn.length; i++) {
					// console.log('Loop');
					var pk = pkmn[i];
					var time = getTime(pk.expiration_time);
					if (time != "0:00") {
						items.push({
							title: pk.name,
							icon: 'images/pkmn_' + pk.pokemonId + '.png',
							subtitle: pk.distance + "m" + '  -  For: ' + time
						});
						keep.push(pk);
					}
				}
				pkmn = keep;
			} else {
				//console.log('No Len');
				items.push({
					title: 'Nothing Nearby',
					subtitle: 'Time for a walk!'
				});
			}
		} else {
			//console.log('Not Arr');
			items.push(dispErr);
		}
		if (sel.itemIndex > items.length - 1) {
			sel.itemIndex = items.length - 1;
		}
		main.items(0, items);
		main.selection(sel.selectionIndex, sel.itemIndex);
		//console.log('Swap Menu');
	});
}, 1000);

main.on('select', function(sel) {
	console.log(sel);
	if (pkmn[sel.itemIndex]) {
		var res = Feature.resolution();
		var pk = pkmn[sel.itemIndex];
		var map = getMap(pk.latitude, pk.longitude, pk.pokemonId, res.x, res.y);
		console.log(map);
		var wind = new UI.Window({
			backgroundColor: 'white',
			status: {
				backgroundColor: 'white',
				separator: Feature.round('none', 'dotted')
			}
		});
		var image = new UI.Image({
			position: new Vector2(0, 0),
			size: new Vector2(res.x, res.y),
			image: map
		});
		wind.add(image);
		wind.show();
	}
});

navigator.geolocation.watchPosition(debounce(60000, success), error, options);
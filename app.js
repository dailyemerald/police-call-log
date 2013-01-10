( function() {

		$(document).ready(function() {
			window.data_url = "http://crime.dailyemerald.com/incidents.json";
			window.whitelist_key = "0AvYMScvV9vpcdC1lMWhvV2x4ZE5jRFF4NGJvcjh6bGc";
			setup_map();
			$.ajax({
				url : data_url,
				dataType : "jsonp",
				success : get_whitelist
			});
		});

		var setup_map = function() {
			var mapOptions = {
				zoom : 14,
				center : new google.maps.LatLng(44.042748, -123.07668),
				mapTypeId : google.maps.MapTypeId.ROADMAP
			};
			window.map = new google.maps.Map(document.getElementById('map'), mapOptions);
			window.infowindow = new google.maps.InfoWindow({
				content : "" // "Violent crimes around University of Oregon campus"?
			});
		};

		var get_whitelist = function(data) {
			window.incidents = data;
			console.log(incidents);
			Tabletop.init({
				key : whitelist_key,
				callback : create_map,
				simpleSheet : true
			});
		};

		var create_map = function(data, tabletop) {
			window.whitelist = data;
			console.log("whitelist:")
			console.log(whitelist);
			_.filter(incidents, function(incident) {
				// really wish google spreadsheets had a boolean type
				// TODO fix this, it keeps returning undefined
				var b = whitelist[incident.incident_description.replace(/(\s+|\W+)/ig, "").toLowerCase()];
				console.log("wl: " + b);
				if (b) {
					return true;
				} else {
					return false;
				}
			});
			console.log("Filtered incidents:");
			console.log(incidents);
			for (var incident in incidents) {
				var marker = new google.maps.Marker({
					position : new google.maps.LatLng(incident.latitude, incident.longitude),
					map : window.map,
					title : incident.incident_description
				});
				google.maps.event.addListener(marker, 'click', function() {
					window.infowindow.content = "<b>" + incident.incident_description + "</b><br>" + incident.received_raw + "<br>" + incident.location;
					window.infowindow.open(window.map, this);
				});
			}

		};

	}())

( function() {

		$(document).ready(function() {
			// resize this to fill the iframe's wrapper
			$("#content").height($(window).height());
			start_spinner();
			window.data_url = "http://crime.dailyemerald.com/incidents.json";
			//window.data_url = "crimes.json";
			window.whitelist_key = "0AvYMScvV9vpcdC1lMWhvV2x4ZE5jRFF4NGJvcjh6bGc";
			setup_map();
			$.ajax({
				url : data_url,
				dataType : "jsonp",
				success : get_whitelist
			});
		});

		var start_spinner = function() {
			var opts = {
				lines : 13,
				length : 7,
				width : 4,
				radius : 10,
				corners : 1,
				rotate : 0,
				color : '#000',
				speed : 1,
				trail : 60,
				shadow : false,
				hwaccel : false,
				className : 'spinner',
				zIndex : 2e9,
				top : 'auto',
				left : 'auto'
			};
			window.spinner = new Spinner(opts).spin(document.getElementById("content"));
		};
		
		var setup_map = function() {
			var mapOptions = {
				zoom : 16,
				center : new google.maps.LatLng(44.042748, -123.07668),
				mapTypeId : google.maps.MapTypeId.ROADMAP
			};
			window.map = new google.maps.Map(document.getElementById("map"), mapOptions);
			window.infowindow = new google.maps.InfoWindow({
				content : "" // "Violent crimes around University of Oregon campus"?
			});
		};

		var get_whitelist = function(data) {
			window.incidents = data;
			Tabletop.init({
				key : whitelist_key,
				callback : create_map,
				simpleSheet : true
			});
		};

		var create_map = function(data, tabletop) {
			window.whitelist = data;
			incidents = _.filter(incidents, function(incident) {
				return whitelist[0][incident.incident_description.replace(/(\s+|\W+)/ig, "").toLowerCase()] === "1";
			});
			window.markers = []; // keep track of these to allow for dynamic filtering later, maybe highlight markers when their corresponding stat element is hovered?
			var categories = {};
			_.each(incidents, function(incident, index, list) {
				// group the incident descriptions and gather summary stats on each category
				if(categories[incident.incident_description]){
					var category = categories[incident.incident_description];
					category.incidents.push(incident);
					category.percentage = category.incidents.length / incidents.length;
				}else{
					categories[incident.incident_description] = {
						incidents: [incident],
						percentage: 1 / incidents.length,
						// TODO add key/value pairs here as needed for new summary stat types
					};
				}
				// TODO maybe move this to a separate loop/function to allow for filtering by category?
				var marker = new google.maps.Marker({
					position : new google.maps.LatLng(incident.latitude, incident.longitude),
					map : window.map,
					title : incident.incident_description
				});
				google.maps.event.addListener(marker, "click", function() {
					window.infowindow.content = "<strong>" + incident.incident_description + "</strong><br>" + incident.received_raw + "<br>" + incident.location;
					window.infowindow.open(window.map, this);
				});
				markers.push(marker);
			});
			console.log("categories", categories);
			show_stats(categories);
		};
		
		var show_stats = function(categories){
			var $list = $("#stats-list");
			// TODO change this tomorrow to preserve keys, sortBy outputs an array and loses the original keys
			categories = _.sortBy(categories, function(category){
				return category.percentage;
			});
			console.log("sorted categories", categories);
			_.each(categories, function(value, key, list){
				var $curr = $("<li class='stat' ><strong>" + key + ":</strong> " + (value.percentage * 100).toFixed(2) + "%</li>");
				$list.prepend($curr); // underscore sorts ascending
			});
			$("#stats").alternateScroll({ "mouse-wheel-sensitivity": 6 });
			spinner.stop();
		};

	}());

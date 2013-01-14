( function() {

		$(document).ready(function() {
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
			window.map = new google.maps.Map(document.getElementById('map'), mapOptions);
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
			console.log(incidents.length)
			_.each(incidents, function(incident, index, list) {
				var marker = new google.maps.Marker({
					position : new google.maps.LatLng(incident.latitude, incident.longitude),
					map : window.map,
					title : incident.incident_description
				});
				google.maps.event.addListener(marker, 'click', function() {
					window.infowindow.content = "<strong>" + incident.incident_description + "</strong><br>" + incident.received_raw + "<br>" + incident.location;
					window.infowindow.open(window.map, this);
				});
			});
			create_stats();
		};
		
		var create_stats = function(){
			// TODO
			
			spinner.stop();
		};

	}());

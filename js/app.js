( function(global) {

	// TODO rewrite this whole thing w/ emberjs, it's getting too complex
	$(document).ready(function() {
		start_spinner();
		window.data_url = "http://crime.dailyemerald.com/incidents.json";
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
		window.spinner = new Spinner(opts).spin(document.getElementById("stats"));
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
		google.maps.event.addListener(map, "zoom_changed", function() {
			refresh();
		});
		google.maps.event.addListener(map, "center_changed", function() {
			refresh();
		});
		window.icons = {
			green: "http://dailyemerald.github.com/police-call-log/icons/green-icon.png",
			yellow: "http://dailyemerald.github.com/police-call-log/icons/yellow-icon.png",
			gray: "http://dailyemerald.github.com/police-call-log/icons/gray-icon.png",
			red: "http://dailyemerald.github.com/police-call-log/icons/red-icon.png"
		}
	};
	
	var get_whitelist = function(data) {
		window.incidents = data;
		Tabletop.init({
			key : whitelist_key,
			callback : create_app,
			simpleSheet : true
		});
	};
	
	var create_app = function(data, tabletop) {
		window.whitelist = data;
		incidents = _.filter(incidents, function(incident) {
			return whitelist[0][incident.incident_description.replace(/(\s+|\W+)/ig, "").toLowerCase()] === "1";
		});
		window.all_categories = {};
		window.total_incidents = incidents.length;
		_.each(incidents, function(incident, index, list) {
			// group the incident descriptions and gather summary stats on each category
			incident.recency = get_recency(new Date(incident.received_raw));
			incident.marker = new google.maps.Marker({
					position : new google.maps.LatLng(incident.latitude, incident.longitude),
					title : incident.incident_description,
					map : window.map
			});
			google.maps.event.addListener(incident.marker, "click", function() {
				window.infowindow.content = "<strong>" + incident.incident_description + "</strong><br>" + incident.received_raw + "<br>" + incident.location;
				window.infowindow.open(window.map, this);
			});
			if(incident.recency == 0) {
				incident.marker.setIcon(icons.green);
			} else if(incident.recency == 1) {
				incident.marker.setIcon(icons.yellow);
			} else {
				incident.marker.setIcon(icons.gray);
			}
			if(all_categories[incident.incident_description]) {
				var category = all_categories[incident.incident_description];
				category.incidents.push(incident);
				category.percentage = category.incidents.length / incidents.length;
			} else {
				all_categories[incident.incident_description] = {
					description : incident.incident_description, // stored again to avoid rewriting sortBy later on, which doesn't preserve the keys
					incidents : [incident],
					percentage : 1 / incidents.length,
					id : Math.floor(Math.random() * 1000000000) // should be more than enough for around 30 categories
				};
			}
		});
		window.incidents = null; // could potentially free up quite a bit of memory after this has time to gather more data
		refresh();
		spinner.stop();
	};
	
	var refresh = function() {
		show_stats(filter_incidents(all_categories));
	};
	
	var get_recency = function(date) {
		var curr = new Date();
		var day = 86400000;
		// msec in a day
		if(curr - date.getTime() < day) {
			// < 1 day
			return 0;
		} else if(curr - date.getTime() < 7 * day) {
			// 1-7 days
			return 1;
		} else {
			// > 7 days
			return 2;
		}
	};
	
	// filters incidents from @categories by the current map boundaries
	var filter_incidents = function(categories) {
		var displayed = [], num_displayed = 0;
		var top = map.getBounds().getNorthEast().lat(), right = map.getBounds().getNorthEast().lng(), bottom = map.getBounds().getSouthWest().lat(), left = map.getBounds().getSouthWest().lng();
		_.each(categories, function(category) {
			category.displayed = [];
			_.each(category.incidents, function(incident) {
				// lat > 0, long < 0
				if(incident.latitude < top && incident.latitude > bottom && incident.longitude < right && incident.longitude > left) {
					category.displayed.push(incident);
				}
			});
			if(category.displayed.length > 0) {
				num_displayed += category.displayed.length;
				displayed.push(category);
			}
		});
		_.each(displayed, function(category) {
			category.displayed_percentage = category.displayed.length / num_displayed;
		});
		return displayed;
	};
	
	var show_stats = function(categories) {
		// get summary stats on all displayed incidents
		categories = _.sortBy(categories, function(category) {
			return category.displayed_percentage;
		});
		var $list = $("#stats-list"), num_displayed = 0;
		$list.html("");
		_.each(categories, function(category, index, list) {
			num_displayed += category.displayed.length;
			var $curr = $("<tr class='stat rounded' id='" + category.id + "' >");
			var stat = _.template($("#stat-template").html(), {
				description : category.description,
				percentage : (category.displayed_percentage * 100).toFixed(1),
				num_displayed : category.displayed.length,
				num_total : category.incidents.length,
			});
			$curr.html(stat);
			if(index % 2 == 1) {
				$curr.addClass("odd");
			} else {
				$curr.addClass("even");
			}
			$curr.mouseenter(toggle_highlights);
			$curr.mouseleave(toggle_highlights);
			$list.prepend($curr); // underscore sorts ascending
		});
		// create summary stats for map viewport
		var $stats_header = $("<tr id='stat-header' ><td>Description</td><td>Percent Shown</td><td>Calls Shown</td><td>Total Calls</td></tr>");
		var summary_stats = _.template($("#stat-header-template").html(), {
			total_shown : num_displayed,
			total : total_incidents,
			shown_percentage : (num_displayed / total_incidents * 100).toFixed(1)
		});
		$list.prepend($("<tr id='totals' class='stat rounded' >").html(summary_stats));
		$list.prepend($stats_header);
		while($list.find("tr").length > 20) {
			$list.find("tr").last().remove();
		}
	};
	
	var toggle_highlights = function() {
		var id = $(this).attr("id");
		var hovered = false;
		_.each(all_categories, function(category) {
			if(category.id == id) {
				hovered = category;
			}
		});
		if(!hovered) { return; }
		_.each(hovered.displayed, function(incident) {
			if(incident.highlighted){
				// back to normal
				if(incident.recency == 0){
					incident.marker.setIcon(icons.green);
				}else if(incident.recency == 1){
					incident.marker.setIcon(icons.yellow);
				}else{
					incident.marker.setIcon(icons.gray);
				}
				incident.highlighted = false;
			}else{
				// highlight
				incident.marker.setIcon(icons.red);
				incident.highlighted = true;
			}

		});
	};
	
}(this));

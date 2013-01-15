( function(global) {

		// TODO rewrite this whole thing w/ emberjs, it's getting too complex
		$(document).ready(function() {
			// resize this to fill the iframe's wrapper
			$("#content").height($(window).height());
			start_spinner();
			window.data_url = "http://crime.dailyemerald.com/incidents.json";
			//window.data_url = "js/crimes.json";
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
			// TODO add a delay on the map events to speed the page up
			google.maps.event.addListener(map, "zoom_changed", function(){
				refresh();
			});
			google.maps.event.addListener(map, "center_changed", function(){
				refresh();
			});
			$("#stats").alternateScroll({ "mouse-wheel-sensitivity": 7 });
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
				var marker = new google.maps.Marker({
					position : new google.maps.LatLng(incident.latitude, incident.longitude),
					title : incident.incident_description
				});
				google.maps.event.addListener(marker, "click", function() {
					window.infowindow.content = "<strong>" + incident.incident_description + "</strong><br>" + incident.received_raw + "<br>" + incident.location;
					window.infowindow.open(window.map, this);
				});
				incident.marker = marker;
				if(all_categories[incident.incident_description]){
					var category = all_categories[incident.incident_description];
					var hour = new Date(incident.received_raw).getHours() - 12;
					category.incidents.push(incident);
					category.percentage = category.incidents.length / incidents.length;
					category.average_time = (hour + (category.incidents.length - 1) * category.average_time) / category.incidents.length; // cumulative moving average
				}else{
					all_categories[incident.incident_description] = {
						description: incident.incident_description, // stored again to avoid rewriting sortBy later on, which doesn't preserve the keys
						incidents: [incident],
						average_time: new Date(incident.received_raw).getHours(), // get average time of day crime occurs
						percentage: 1 / incidents.length,
					};
				}
			});
			window.incidents = null; // could potentially free up quite a bit of memory after this has time to gather more data
			$(".stat").mouseenter(function(){
				// TODO fix this, allow persistent selection too
				var description = $(this).find("#stat-description").text();
				// TODO seriously, rewrite this with emberjs
				var category = false;
				_.each(all_categories, function(curr_category){
					console.log("category compare: ", description, curr_category.description);
					if(description == curr_category.description){
						category = curr_category;
					}
				});
				if(!category) { return; }		
				show_category_markers(category);
			});
			$(".stat").mouseleave(function(){
				refresh();
			});
			refresh();
			spinner.stop();
		};
		
		var refresh = function(){
			clear_map();
			var displayed = filter_incidents(all_categories);
			show_markers(displayed);
			show_stats(displayed);
		};
		
		var show_category_markers = function(category){
			clear_map();
			show_markers(filter_incidents([category]));
		};
		
		// filters incidents from @categories by the current map boundaries
		var filter_incidents = function(categories){
			var displayed = [], sum = 0;
			var top = map.getBounds().getNorthEast().lat(),
				right = map.getBounds().getNorthEast().lng(),
				bottom = map.getBounds().getSouthWest().lat(),
				left = map.getBounds().getSouthWest().lng();
			_.each(categories, function(category){
				// var curr = $.clone(category); hmm, this wont work
				var curr = {
					incidents: [],
					description: category.description,
					average_time: category.average_time // TODO dynamically change this too
				};
				_.each(category.incidents, function(incident){
					// lat > 0, long < 0
					if(incident.latitude < top
						&& incident.latitude > bottom
						&& incident.longitude < right
						&& incident.longitude > left){
							curr.incidents.push(incident);
							sum++;
						}
				});
				if(curr.incidents.length != 0){
					displayed.push(curr);
				}
			});
			// calculate percentages for crimes on the map
			_.each(displayed, function(category){
				category.percentage = category.incidents.length / sum;
			});
			return displayed;
		};
		
		var show_markers = function(categories){
			_.each(categories, function(category){
				_.each(category.incidents, function(incident){
					incident.marker.setMap(window.map);
				});
			});
		};
		
		var clear_map = function(){
			_.each(all_categories, function(category){
				_.each(category.incidents, function(incident){
					incident.marker.setMap(null);
				});
			});
		};
			
		var show_stats = function(categories){
			categories = _.sortBy(categories, function(category){
				return category.percentage;
			});
			var $list = $("#stats-list");
			$list.html("");
			_.each(categories, function(category, index, list){
				var $curr = $("<li>");
				if(category.average_time < 1){
					// TODO fix this to get a better representation of the time
					category.average_time += 12;					}
				var stat = _.template($("#stat-template").html(), {
					description: category.description,
					percentage: (category.percentage * 100).toFixed(1),
					hour: category.average_time.toFixed(2) 
				});
				$curr.html(stat);
				$list.prepend($curr); // underscore sorts ascending
			});
		};

	}(this));

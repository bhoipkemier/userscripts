// ==UserScript==
// @name         Legacy UI
// @namespace    http://hoipkemier.com/
// @version      0.1
// @description  Legacy layout for scheduler
// @author       Benjamin Hoipkemier
// @match        https://mrbc.ccbchurch.com/goto/scheduling*
// @grant        none
// @require      https://code.jquery.com/jquery-1.12.4.min.js
// ==/UserScript==

// curl "https://mrbc.ccbchurch.com/api/scheduling/event_positions/4562/assignments" -H "sec-fetch-mode: cors" -H "origin: https://mrbc.ccbchurch.com" -H "accept-encoding: gzip, deflate, br" -H "accept-language: en-US,en;q=0.9,en-CA;q=0.8" -H "cookie: __cfduid=d0d3ef46962a5de6d9df822fcc28348891570280086; screen-size=SIZE/LARGE; sidebar-opened=true; _ga=GA1.2.903768189.1570280091; _gid=GA1.2.466744206.1570280091; PHPSESSID=8c0c3b1baff9c088eda6af2639f87b83; _uiq_id.603070201.d525=fe12c19898493989.1570280091.0.1570281160..; _gat=1" -H "pragma: no-cache" -H "x-newrelic-id: VQIGWVdRCxACUFhUBAcCUlA=" -H "user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36" -H "content-type: application/json;charset=UTF-8" -H "accept: application/json, text/plain, */*" -H "cache-control: no-cache" -H "authority: mrbc.ccbchurch.com" -H "referer: https://mrbc.ccbchurch.com/goto/scheduling/14/grid?schedule_ids^[^]=105" -H "sec-fetch-site: same-origin" --data-binary "^{^\^"individual_ids^\^":^[2806^],^\^"status^\^":null,^\^"update_existing_status^\^":false,^\^"update_notified^\^":false,^\^"notify_schedule_organizer^\^":false^}" --compressed

var curWorkers = [];
var workerCount = {};
(function() {
	'use strict';
	const css = `
		.hoipUI { position: absolute; left: 0; right:0; top:0; }
		.tblAvailability { background-color: #fff; }
		.tblAvailability th { text-align: center;background-color: #ccc;}
		.tblAvailability td { vertical-align: text-top;}
		.tblAvailability th,.tblAvailability td { border: 1px solid #000; }
		.passign .badge { display: none }
		.active.passign .badge { display: block }
		.eventContainer { padding-bottom: 15px; }
		.eventContainer.peopleReq, .eventContainer.unAvail { padding-bottom: 30px; cursor: pointer; }
		.list-group.eventContainer { margin-bottom: 0 }
		.active.person, .avail { background-color: rgb(214,233,198); border: 1px solid rgb(60,118,61); }
	`;
	const log = (function(msg){ console.log(msg); });
	const addMenuItem = (function(menu){
			var div1 = document.createElement("DIV");
			div1.innerHTML = '<div class="TouchRipple__root TouchRipple__fullWidth hoipMenuItem" data-test="TouchRipple"><div class="list-item__container list-item__hoverable" data-test="ListItem" data-clickable="true"><div class="list-item__listItem list-item__clickable list-item__xsmall list-item__smallGap" data-test="list-item"><div class="list-item__textContainer list-item__slideContainer" style="transform: translateX(0px);"><div class="list-item__headerContainer"><div data-test="header" class="list-item__header list-item__primary list-item__singleLine hoipLegacyUI">Legacy User Interface</div></div></div></div></div><div></div></div>';
			menu.appendChild(div1)
			var button = document.getElementsByClassName("hoipLegacyUI")[0];
			button.addEventListener('click', function (){
				showLegacyUI();
			});
			return div1;
	});

	const showLegacyUI = (function() {
		$('body')[0].innerHTML = '<div class="hoipUI"><h1>Hello World</h1></div>';
		$('head').append('<link href="https://stackpath.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet" crossorigin="anonymous"><style>'+css+'</style>');
		fetchScheduleData(getScheduleIds(), loadTable);
		fetchNurseryWorkers();
		addHoipEvents();
	});

	var addHoipEvents = (function() {
		$('.hoipUI').on('click', '.people .person', activatePerson)
			.on('click', '.addToEvent', addToEvent);
	});

	var addToEvent = (function() {
		const eventid = $('.eventID', $(this).closest('td')).val();
		const personid = $('.people .person.active .personID').val();
		console.log('Add eventId: ' + eventid + ' personId: ' + personid);
	});

	var activatePerson = (function() {
		$('.active').removeClass('active');
		$(this).addClass('active');
		const personId = $('.personID', this).val();
		$('.tblAvailability .person input[value="'+personId+'"]').closest('.person').addClass('active');
	});

	var fetchNurseryWorkers = (function(){
		curWorkers = [];
		getWorkers(1, workersLoaded);
	});

	var getWorkers = (function(page, afterLoad) {
		var addr = 'https://mrbc.ccbchurch.com/group_detail.php?aj=1&ax=group_participants&group_id=26&page='+page;
		$.get(addr, '', function(data){
			const parsedData = $('[data-trk="GroupParticipantLink"] a', data);
			if(parsedData.length > 0) {
				getWorkers(page + 1, afterLoad);

				for(var i = 0; i < parsedData.length; ++i) {
					const link = $(parsedData.get(i));
					const href = link.attr('href');
					const indx = href.indexOf('individual_id=') + 14;
					curWorkers.push({
						name: link.text(),
						id: href.substr(indx)
					});
				}
			} else {
				afterLoad()
			}
		}, 'html');
	});

	var workersLoaded = function() {
		const workerDiv = $('<div class="list-group people col-md-2"/>')
		curWorkers.forEach(w => {
			const a = $('<div class="list-group-item person"/>').text(flipName(w.name));
			a.append($('<input type="hidden" class="personID"/>').attr('value',w.id))
			a.append($('<span class="occurCount badge">0</span>'));
			workerDiv.append(a);
		});
		$('.hoipUI').prepend(workerDiv);
		updateCounts();
	};

	var flipName = function(name) {
		const indx = name.indexOf(' ');
		if (indx + 2 >= name.length) {return name;}
		return name.substr(indx + 1) + ', ' + name.substr(0, indx);
	}

	var updateCounts = function(){
		const counter = {};
		$('.passign').each(function(){
			const id = $('input', this).val();
			if(!counter[id]) { counter[id] = 0; }
			++counter[id];
		});
		let peopleArr = [];
		$('.people .person').each(function() {
			const id = $('.personID', this).val();
			const occurCount = counter[id] || 0;
			$('.occurCount', this).text(occurCount);
			peopleArr.push({
				el: this,
				count: occurCount,
				name: $(this).text()
			});
		});

		peopleArr = peopleArr.sort((a,b) => a.count > b.count ? 1 : (a.count < b.count ? -1 : (a.name > b.name ? 1 : -1)));
		const div = $('.list-group.people').empty();
		peopleArr.forEach(p => {
			div.append(p.el);
		});
	};

	var loadTable = function(schedules) {
		var table = getTable(schedules);
		$('.hoipUI').empty().append(table);
	};

	var getTable = function(schedules){
		let lastHeader = '';
		var events = getEvents(schedules);
		var toReturn = $('<table class="tblAvailability"></table>');
		events.forEach(event => {
			const curHeader = getHeaderHtml(event);
			if(curHeader !== lastHeader){
				lastHeader = curHeader;
				toReturn.append(curHeader);
			}
			toReturn.append(getEventRow(event));
		});
		return toReturn;
	}

	var getEventRow = function(event){
		const dateText = new Date(event.start).toLocaleDateString() + ' ' + new Date(event.start).toLocaleTimeString().replace(':00 ', ' ');
		const toReturn = $('<tr/>')
		toReturn.append($('<th/>').text(dateText));
		getEventPositions(event).forEach(position => {
			const eventContainer = $('<div class="eventContainer list-group"/>')
			const cell = $('<td/>').append(eventContainer);
			cell.append($('<input type="hidden" class="eventID" />').val(position.id))

			position.assignments.forEach(assignment => {
				var passign = $('<a href="javascript:void" class="passign person list-group-item"/>')
					.text(assignment.volunteer.individual.name)
					.append('<a href="javascript:void" class="btn badge"><i class="glyphicon glyphicon-trash removePassign"></i></a>')
					.append($('<input type="hidden" />').val(assignment.volunteer.individual.id));
				eventContainer.append(passign);
			});
			cell.append('<button class="addToEvent">Add to Event</button');
			toReturn.append(cell);
		});
		return toReturn;
	}

	var getEventPositions = (event) => event.event_teams.flatMap(t => t.event_positions);

	var getHeaderHtml = function(event){
		const positionCells = getEventPositions(event)
			.map(p => '<th>' + p.position.name + '</th>');
		return '<tr><th>Date/Time</th>' + positionCells.join('') + '</tr>';
	}

	var getEvents = function(schedules){
		return schedules.reduce((prev, cur) => prev.concat(cur.events), []);
	}

	var fetchScheduleData = function(scheduleIds, callback) {
		const querySched = scheduleIds.map(s => '&schedule_ids[]=' + s).join('');
		const addr = 'https://mrbc.ccbchurch.com/api/scheduling/categories/14/schedules?uniqueId=' + querySched + '&page=1&per_page=1000&get_full_schedules=true&with_metrics=1';
		$.get(addr, function(schedules){
			schedules = schedules.sort((s1, s2) => new Date(s1.start) < new Date(s2.start)? -1 : 1);
			callback(schedules);
		});
	}

	var getScheduleIds = function() {
		const params = new URLSearchParams(location.search);
		if(!params) return [];
		const scheduleIds = params.getAll('schedule_ids[]');
		if(!scheduleIds) return [];
		return scheduleIds;
	}

	const main = (function(menu){
		addMenuItem(menu);
	});

	const mainInterval = setInterval(function() {
		var menu = document.querySelector('[data-test="portalContainer"] [data-test="listContainer"]');
		if(!!menu){
			if($('.hoipMenuItem').length === 0) { main(menu); }
		}
	}, 5000);
})();

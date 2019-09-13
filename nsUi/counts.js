// ==UserScript==
// @name         Nursery Counts
// @namespace    http://hoipkemier.com/
// @version      0.2
// @description  get worker counts
// @author       Benjamin Hoipkemier
// @match        https://mrbc.ccbchurch.com/goto/scheduling*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    const categoryId = 14; // this is the nursery category
    const css = `
        .people-counts {
            text-align: center;
        }
        .peopleCountContainer div {
            margin: 10px 0 0 10px
        }
        .serviceLink {
            display: block;
        }
        .workerAssignment {
            cursor: pointer;
        }
    `;

    const log = (function(msg){ console.log(msg); });
    const addContainer = (function(){
        let sidebar = document.getElementsByClassName("navigation-sidebar__sidebarLinks");
        if(!sidebar || sidebar.length < 1) {
            log('couldn\'t load sidebar');
        }
        sidebar = sidebar[0];
        const toReturn = document.createElement("DIV");
        const style = document.createElement("STYLE");
        const select = document.createElement("SELECT");
        let option = document.createElement("OPTION");
        toReturn.setAttribute("class", "people-counts");
        let textnode = document.createTextNode(getMonthText(new Date()));
        option.appendChild(textnode);
        option.setAttribute("value", "" + new Date());
        select.appendChild(option);
        let nextMonth = new Date().addMonths(1);
        option = document.createElement("OPTION");
        textnode = document.createTextNode(getMonthText(nextMonth));
        option.appendChild(textnode);
        option.setAttribute("value", "" + nextMonth);
        select.appendChild(option);
        toReturn.appendChild(select);
        sidebar.appendChild(toReturn);
        const peopleDiv = document.createElement("DIV");
        peopleDiv.setAttribute('class', 'peopleCountContainer');
        peopleDiv.setAttribute('style', 'text-align:left');
        toReturn.appendChild(peopleDiv);
        select.addEventListener("change", function() {
            loadMonth(new Date(select.value));
        });
        style.innerHTML = css;
        toReturn.appendChild(style);
        return toReturn;
    });

    const getMonthText = (function(date) {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return monthNames[date.getMonth()] + ' ' + date.getFullYear();
    });

    const main = (function(){
        const container = addContainer();
        loadMonth(new Date());
    });

    const loadMonth = (function(date) {
        const workers = getWorkers(date);
        let container = document.getElementsByClassName("peopleCountContainer")[0];
        container.innerHTML = '';
        workers.forEach(worker => {
            const linkDiv = document.createElement("DIV");
            linkDiv.setAttribute('class', 'linkDiv');
            const span = document.createElement("DIV");
            span.setAttribute('class', 'workerAssignment');
            let textnode = document.createTextNode(worker.name + ' (' + worker.assignments.length + ')');
            span.appendChild(textnode);
            span.appendChild(linkDiv);
            worker.assignments.forEach(assignment => {
                const link = document.createElement("A");
                link.setAttribute('class', 'serviceLink');
                const date = new Date(assignment.date);
                const linkText = document.createTextNode((date.getMonth() + 1) + '-' + date.getDate() + '-' + date.getFullYear() + ' ' + assignment.event);
                link.appendChild(linkText);
                link.setAttribute('href','https://mrbc.ccbchurch.com/goto/scheduling/' + categoryId + '/grid?schedule_ids[]=' + assignment.scheduleId);
                linkDiv.appendChild(link);
            });
            linkDiv.style.display = 'none';
            container.appendChild(span);
            span.addEventListener('click', function (){
                linkDiv.style.display = (linkDiv.style.display === 'none') ? 'block' : 'none';
            });
        });
    });

    const getAllWorkers = (function(){
        const data = JSON.parse(get('https://mrbc.ccbchurch.com/api/scheduling/categories/' + categoryId + '/serving_rotations?get_full_serving_rotations=true'));
        return data.map(servSched =>
            servSched.serving_rotation_teams.map(team =>
                team.serving_rotation_positions.map(position =>
                    position.serving_rotation_assignments.map(assignment =>
                        assignment.volunteer.individual.name
                    )
                )
            )
        )
        .flat(4);
    });

    const getWorkers = (function(date) {
        let schedules = JSON.parse(get('https://mrbc.ccbchurch.com/api/scheduling/categories/' + categoryId + '/schedules?uniqueId=current_schedules&page=1&per_page=25&after=' + new Date().getFullYear() +'-' + ("0" + (new Date().getMonth() + 1)).slice(-2) + '-01&with_metrics=1'));
        schedules = schedules
            .filter(s => s.category_id === categoryId && date.getYear() === new Date(s.start).getYear() && date.getMonth() === new Date(s.start).getMonth())
            .map(s => s.id);
        const namedAssignment = schedules.map(id =>
            JSON.parse(get('https://mrbc.ccbchurch.com/api/scheduling/categories/' + categoryId + '/schedules?uniqueId=&page=1&per_page=5&schedule_ids[]=' + id + '&get_full_schedules=true&with_metrics=1'))
                .map(schedule =>
                     schedule.events.map(event =>
                          event.event_teams.map(team =>
                              team.event_positions.map(position =>
                                  position.assignments.map(assignment =>
                                      ({
                                          name: assignment.volunteer.individual.name,
                                          scheduleId: id,
                                          date: event.end,
                                          event: event.name
                                      })
                                  )
                              )
                          )
                     )
                )
        )
        .flat(6)
        .reduce((acc, cv) => {
            const entry = acc.find(v => v.name === cv.name);
            if(!entry) {
                acc.push({name:cv.name, assignments:[cv]});
            } else {
                entry.assignments.push(cv);
            }
            return acc;
        }, []);
        addUnassigned(namedAssignment);
        namedAssignment.sort((a,b) =>
            a.assignments.length === b.assignments.length ? (a.name > b.name ? 1 : -1):
            a.assignments.length > b.assignments.length ? 1 : -1
        );
        return namedAssignment;
    });

    const addUnassigned = (function(namedAssignment){
        const allWorkers = getAllWorkers();
        allWorkers.reduce((acc, cv) => {
            if(!acc.find(n => n.name == cv)) {
                acc.push({name:cv, assignments:[]});
            }
            return acc;
        }, namedAssignment);
    });

    const get = (function httpGet(theUrl) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
        xmlHttp.send( null );
        return xmlHttp.responseText;
    });

    const mainInterval = setInterval(function() {
        if(document.getElementsByClassName("navigation-sidebar__sidebarLinks").length > 0) {
            clearInterval(mainInterval);
            main();
        }
    }, 500);
})();

Date.isLeapYear = function (year) {
    return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0));
};

Date.getDaysInMonth = function (year, month) {
    return [31, (Date.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
};

Date.prototype.isLeapYear = function () {
    return Date.isLeapYear(this.getFullYear());
};

Date.prototype.getDaysInMonth = function () {
    return Date.getDaysInMonth(this.getFullYear(), this.getMonth());
};

Date.prototype.addMonths = function (value) {
    var n = this.getDate();
    this.setDate(1);
    this.setMonth(this.getMonth() + value);
    this.setDate(Math.min(n, this.getDaysInMonth()));
    return this;
};
// ==UserScript==
// @name         Legacy UI
// @namespace    http://hoipkemier.com/
// @version      0.1
// @description  Legacy layout for scheduler
// @author       Benjamin Hoipkemier
// @match        https://mrbc.ccbchurch.com/goto/scheduling*
// @grant        none
// ==/UserScript==

(function() {
	'use strict';
	const log = (function(msg){ console.log(msg); });
	const addMenuItem = (function(menu){
			var div1 = document.createElement("DIV");
			div1.innerHTML = '<div class="TouchRipple__root TouchRipple__fullWidth" data-test="TouchRipple"><div class="list-item__container list-item__hoverable" data-test="ListItem" data-clickable="true"><div class="list-item__listItem list-item__clickable list-item__xsmall list-item__smallGap" data-test="list-item"><div class="list-item__textContainer list-item__slideContainer" style="transform: translateX(0px);"><div class="list-item__headerContainer"><div data-test="header" class="list-item__header list-item__primary list-item__singleLine hoipLegacyUI">Legacy User Interface</div></div></div></div></div><div></div></div>';
			menu.appendChild(div1)
			var button = document.getElementsByClassName("hoipLegacyUI")[0];
			button.addEventListener('click', function (){
				replaceContent('https://userscripts.hoipkemier.com/nsUi/index.html');
			});
			return div1;
	});

	const main = (function(menu){
			const menuItem = addMenuItem(menu);
	});

	const replaceContent = (function (path) {
		fetch(path)
			.then(response => response.text())
			.then(text => {
				document.open();
				document.write(text);
				document.close();
			});
	});

	const mainInterval = setInterval(function() {
		var menu = document.querySelector('[data-test="portalContainer"] [data-test="listContainer"]');
		if(!!menu){
			clearInterval(mainInterval);
			main(menu);
		}
	}, 500);
})();

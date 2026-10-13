/* --------------------------------------------
   mobile-nav.js : hamburger toggle for the home menu
   The menu links themselves are still handled by the template's AJAX loader
   (js/main.js); this file only opens/closes the narrow-screen dropdown.
   -------------------------------------------- */
(function () {
	'use strict';
	var btn = document.getElementById('menu-toggle');
	var menu = document.getElementById('home-menu');
	if (!btn || !menu) return;

	var root = document.documentElement;
	var narrow = window.matchMedia('(max-width: 720px)');

	function isOpen() { return root.classList.contains('menu-open'); }

	function setOpen(open) {
		root.classList.toggle('menu-open', open);
		btn.setAttribute('aria-expanded', open ? 'true' : 'false');
		btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
	}

	btn.addEventListener('click', function (e) {
		e.stopPropagation();
		setOpen(!isOpen());
	});

	// choosing a section closes the menu; the AJAX loader still handles the navigation
	menu.addEventListener('click', function (e) {
		if (e.target.closest && e.target.closest('a')) setOpen(false);
	});

	// tap outside closes it
	document.addEventListener('click', function (e) {
		if (isOpen() && !menu.contains(e.target) && !btn.contains(e.target)) setOpen(false);
	});

	// Escape closes it and returns focus to the button
	document.addEventListener('keydown', function (e) {
		if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); }
	});

	// opening any section from elsewhere (hero button, profile badge) also closes it
	window.addEventListener('hashchange', function () { setOpen(false); });

	// leaving the narrow layout (rotate / resize) resets the state
	var onChange = function (m) { if (!m.matches) setOpen(false); };
	if (narrow.addEventListener) narrow.addEventListener('change', onChange);
	else if (narrow.addListener) narrow.addListener(onChange);
})();

/* --------------------------------------------
   hero-effects.js : portrait parallax + champagne drizzle
   One script, one requestAnimationFrame loop, one canvas.
   Adapted from the reference template's initHeroParallax() and
   particle engine, with a fixed particle pool (no per-frame
   allocation), visibility pausing, reduced-motion and touch handling.
   -------------------------------------------- */
(function () {
	'use strict';
	if (window.__heroEffects) return;          // never start twice
	window.__heroEffects = true;

	var canvas = document.getElementById('particle-canvas');
	var heroImg = document.getElementById('hero-img');
	var panel = document.querySelector('.one-page-content');

	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	var coarse = window.matchMedia('(hover: none), (pointer: coarse)');
	var ctx = canvas ? canvas.getContext('2d', { alpha: true }) : null;

	var width = 0, height = 0, dpr = 1;
	var running = false, rafId = 0, lastT = 0;

	/* ------------------------------------------------------------
	   PARALLAX (pointer driven, eased, perspective tilt)
	   ------------------------------------------------------------ */
	var targetX = 0, targetY = 0, curX = 0, curY = 0;

	function onPointerMove(e) {
		if (coarse.matches || reduceMotion.matches) return;
		var cx = width / 2, cy = height / 2;
		targetX = clamp((e.clientX - cx) / cx, -1, 1);
		targetY = clamp((e.clientY - cy) / cy, -1, 1);
	}
	function onPointerLeave() { targetX = 0; targetY = 0; }

	function stepParallax() {
		if (!heroImg) return;
		if (reduceMotion.matches || coarse.matches) {
			if (heroImg.style.transform) heroImg.style.transform = '';
			return;
		}
		curX += (targetX - curX) * 0.06;
		curY += (targetY - curY) * 0.06;
		if (Math.abs(curX) < 0.0005 && Math.abs(curY) < 0.0005 && !targetX && !targetY) {
			if (heroImg.style.transform) heroImg.style.transform = '';
			return;
		}
		var tiltX = -curY * 2.2;          // degrees, kept small on purpose
		var tiltY = curX * 3.2;
		var shiftX = curX * 7;            // px
		var shiftY = curY * 3;
		heroImg.style.transform = 'perspective(1100px) rotateX(' + tiltX.toFixed(2) + 'deg) rotateY(' +
			tiltY.toFixed(2) + 'deg) translate3d(' + shiftX.toFixed(2) + 'px,' + shiftY.toFixed(2) + 'px,0)';
	}

	/* ------------------------------------------------------------
	   DRIZZLE (fixed pool of particles, scroll-reactive)
	   ------------------------------------------------------------ */
	var COLORS = [
		[212, 163, 115],   // champagne gold  #D4A373
		[231, 198, 163],   // light champagne #E7C6A3
		[196, 150, 104],   // warm amber
		[222, 200, 172],   // soft sand
		[178, 136, 92]     // muted bronze
	];
	var BASE = 70, EXTRA = 130;           // desktop budget; reduced on small / touch screens
	var pool = [];
	var activeBase = 0;
	var vel = 0, velTarget = 0;           // scroll-driven speed boost
	var dens = 0, densTarget = 0;         // scroll-driven extra particles

	function budget() {
		var small = width < 768 || coarse.matches;
		BASE = small ? 34 : 70;
		EXTRA = small ? 50 : 130;
		activeBase = BASE;
		if (!pool.length) {
			var total = 70 + 130;
			for (var i = 0; i < total; i++) pool.push(makeParticle());
			for (var j = 0; j < pool.length; j++) { respawn(pool[j], true); pool[j].active = j < BASE; pool[j].storm = false; }
		}
		for (var k = 0; k < pool.length; k++) {
			if (k < BASE) { pool[k].active = true; pool[k].storm = false; }
			else if (!pool[k].storm) pool[k].active = false;
		}
	}

	function makeParticle() {
		return { x: 0, y: 0, r: 1, vy: 1, vx: 0, ph: 0, ps: 0.01, c: COLORS[0], a: 0.3, ba: 0.3, active: false, storm: false, life: 0 };
	}

	function respawn(p, spread) {
		p.x = Math.random() * width;
		p.y = spread ? Math.random() * height : -12 - Math.random() * 30;
		p.r = Math.random() * 1.3 + 0.7;                 // 0.7 - 2.0 px: fine droplets
		p.vy = Math.random() * 0.55 + 0.35;              // slow resting drift
		p.vx = (Math.random() - 0.5) * 0.22;
		p.ph = Math.random() * 6.2832;
		p.ps = Math.random() * 0.018 + 0.006;
		p.c = COLORS[(Math.random() * COLORS.length) | 0];
		p.ba = Math.random() * 0.32 + 0.16;              // restrained opacity
		p.a = p.ba;
	}

	function boost(magnitude) {
		if (reduceMotion.matches) return;
		var b = Math.min(magnitude * 0.028, 5.5);
		velTarget = Math.min(velTarget + b, 9);
		densTarget = Math.min(densTarget + b * 1.0, EXTRA);
	}

	function spawnStorm(n) {
		for (var i = BASE; i < pool.length && n > 0; i++) {
			if (i - BASE >= EXTRA) break;
			var p = pool[i];
			if (!p.active) {
				respawn(p, true);
				p.active = true; p.storm = true; p.life = 80 + Math.random() * 140;
				n--;
			}
		}
	}

	function stepParticles() {
		if (!ctx) return;
		vel += (velTarget - vel) * 0.1;
		velTarget *= 0.93; if (velTarget < 0.01) velTarget = 0;
		dens += (densTarget - dens) * 0.08;
		densTarget *= 0.9; if (densTarget < 0.1) densTarget = 0;
		if (dens > 1) spawnStorm(Math.floor(dens * 0.08));

		ctx.clearRect(0, 0, width, height);
		var streak = vel > 0.5;
		for (var i = 0; i < pool.length; i++) {
			var p = pool[i];
			if (!p.active) continue;
			p.ph += p.ps;
			p.x += p.vx + Math.sin(p.ph) * 0.22;
			p.y += p.vy + vel * (p.vy * 3.2 + 1.0);
			p.a = Math.min(0.5, p.ba + vel * 0.03);
			if (p.storm) { p.life--; }
			if (p.y > height + 20) {
				if (p.storm && p.life <= 0) { p.active = false; p.storm = false; continue; }
				respawn(p, false);
			}
			if (p.x < -10) p.x = width + 8; else if (p.x > width + 10) p.x = -8;

			ctx.beginPath();
			if (streak) {
				ctx.ellipse(p.x, p.y, p.r * 0.8, p.r * Math.min(8, 1 + vel * 1.15), 0, 0, 6.2832);
			} else {
				ctx.arc(p.x, p.y, p.r, 0, 6.2832);
			}
			ctx.fillStyle = 'rgba(' + p.c[0] + ',' + p.c[1] + ',' + p.c[2] + ',' + p.a.toFixed(3) + ')';
			ctx.fill();
		}
	}

	/* ------------------------------------------------------------
	   Canvas sizing
	   ------------------------------------------------------------ */
	function resize() {
		width = window.innerWidth;
		height = window.innerHeight;
		dpr = Math.min(window.devicePixelRatio || 1, 2);
		if (canvas) {
			canvas.width = Math.floor(width * dpr);
			canvas.height = Math.floor(height * dpr);
			if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(dpr, dpr); }
		}
		budget();
		for (var i = 0; i < pool.length; i++) {            // keep everything inside the new bounds
			if (pool[i].x > width) pool[i].x = Math.random() * width;
			if (pool[i].y > height) pool[i].y = Math.random() * height;
		}
	}

	/* ------------------------------------------------------------
	   One loop for both effects
	   ------------------------------------------------------------ */
	function frame(t) {
		rafId = requestAnimationFrame(frame);
		if (t - lastT < 14) return;                         // ~60fps cap
		lastT = t;
		stepParallax();
		stepParticles();
	}
	function start() {
		if (running || document.hidden) return;
		if (reduceMotion.matches) { applyReducedMotion(); return; }
		running = true; lastT = 0;
		rafId = requestAnimationFrame(frame);
	}
	function stop() {
		running = false;
		if (rafId) cancelAnimationFrame(rafId);
		rafId = 0;
	}
	function applyReducedMotion() {
		stop();
		if (ctx) ctx.clearRect(0, 0, width, height);
		if (heroImg) heroImg.style.transform = '';
		if (canvas) canvas.style.display = 'none';
	}

	/* ------------------------------------------------------------
	   Inputs: wheel / touch / keys on the page, scroll inside panels,
	   and navigation clicks. None of them blocks default behaviour.
	   ------------------------------------------------------------ */
	window.addEventListener('wheel', function (e) { boost(Math.abs(e.deltaY) + Math.abs(e.deltaX)); }, { passive: true });

	var touchY = 0;
	window.addEventListener('touchstart', function (e) { if (e.touches.length) touchY = e.touches[0].clientY; }, { passive: true });
	window.addEventListener('touchmove', function (e) {
		if (!e.touches.length) return;
		var y = e.touches[0].clientY;
		boost(Math.abs(y - touchY) * 1.4);
		touchY = y;
	}, { passive: true });

	window.addEventListener('keydown', function (e) {
		if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', ' ', 'Home', 'End'].indexOf(e.key) !== -1) boost(110);
		var t = e.target;
		if (t && t.classList && t.classList.contains('full-screen-wrap') && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault(); t.click();
		}
	});

	if (panel) {
		var lastTop = 0;
		panel.addEventListener('scroll', function () {
			var d = Math.abs(panel.scrollTop - lastTop);
			lastTop = panel.scrollTop;
			boost(d * 1.6);
		}, { passive: true });
	}

	// a gentle surge when opening a section from the menu or hero buttons
	document.addEventListener('click', function (e) {
		var a = e.target.closest && e.target.closest('.home-menu a, .hero-cta a, .profile-badge, .close-page');
		if (a) boost(90);
	});

	document.addEventListener('mousemove', onPointerMove, { passive: true });
	document.documentElement.addEventListener('mouseleave', onPointerLeave);
	window.addEventListener('blur', onPointerLeave);
	window.addEventListener('resize', resize, { passive: true });
	document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
	var onRM = function () { if (reduceMotion.matches) applyReducedMotion(); else { if (canvas) canvas.style.display = ''; start(); } };
	if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onRM);

	function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

	resize();
	start();
})();

(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  if (window.AOS) AOS.init({ duration: 800, easing: 'ease-out-cubic', once: true, offset: 60 });

  /* header */
  var header = $('#header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 20); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* mobile menu */
  $('#burger').addEventListener('click', function () { document.body.classList.toggle('menu-open'); });
  $$('.nav a').forEach(function (a) {
    a.addEventListener('click', function () { document.body.classList.remove('menu-open'); });
  });

  /* open / closed status (Пн–Сб 9:00–20:00) */
  function updateStatus() {
    var d = new Date(), day = d.getDay(), h = d.getHours();
    var open = day !== 0 && h >= 8 && h < 18;
    $('#status').classList.toggle('closed', !open);
    $('#statusText').textContent = open ? 'Сейчас открыто' : 'Сейчас закрыто';
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* animated counters */
  function fmt(n) { return n.toLocaleString('ru-RU'); }
  function runCounter(el) {
    var target = +el.dataset.count, suffix = el.dataset.suffix || '', start = null, dur = 1800;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(Math.round(target * e)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { runCounter(en.target); io.unobserve(en.target); }
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach(function (el) { io.observe(el); });

  /* cursor glow on cards */
  $$('.glow').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* modal */
  var modal = $('#modal'), form = $('#form'), formView = $('#formView'), okView = $('#okView');
  var title = $('#modalTitle'), nameI = $('#name'), phoneI = $('#phone'), dateI = $('#date');
  var target = '', lastFocus = null;

  function pad(n) { return String(n).padStart(2, '0'); }
  function minDate() {
    var d = new Date(Date.now() + 3600000);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function openModal(doctor, service) {
    lastFocus = document.activeElement;
    target = doctor ? doctor : (service || '');
    title.textContent = doctor ? 'Запись к врачу: ' + doctor : (service ? 'Запись на услугу: ' + service : 'Запись на приём');
    formView.hidden = false;
    okView.hidden = true;
    form.reset();
    clearErrors();
    dateI.min = minDate();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock');
    document.body.classList.remove('menu-open');
    setTimeout(function () { nameI.focus(); }, 350);
  }
  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lock');
    if (lastFocus) lastFocus.focus();
  }

  $$('[data-book]').forEach(function (b) {
    b.addEventListener('click', function () { openModal(b.dataset.doctor, b.dataset.service); });
  });
  $$('[data-close]').forEach(function (b) { b.addEventListener('click', closeModal); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  /* phone mask +7 (___) ___-__-__ */
  phoneI.addEventListener('input', function () {
    var d = phoneI.value.replace(/\D/g, '');
    if (d[0] === '8' || d[0] === '7') d = d.slice(1);
    d = d.slice(0, 10);
    var o = '';
    if (d.length) o = '+7 (' + d.slice(0, 3);
    if (d.length >= 3) o += ') ' + d.slice(3, 6);
    if (d.length >= 6) o += '-' + d.slice(6, 8);
    if (d.length >= 8) o += '-' + d.slice(8, 10);
    phoneI.value = o;
  });

  /* validation */
  function setError(input, msg) {
    var f = input.closest('.field');
    f.classList.add('bad');
    $('.err', f).textContent = msg;
    void f.offsetWidth;
  }
  function clearErrors() {
    $$('.field').forEach(function (f) { f.classList.remove('bad'); $('.err', f).textContent = ''; });
  }
  [nameI, phoneI, dateI].forEach(function (i) {
    i.addEventListener('input', function () {
      var f = i.closest('.field'); f.classList.remove('bad'); $('.err', f).textContent = '';
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();
    var ok = true;
    if (nameI.value.trim().length < 2) { setError(nameI, 'Введите имя'); ok = false; }
    if (phoneI.value.replace(/\D/g, '').length !== 11) { setError(phoneI, 'Введите номер полностью'); ok = false; }
    if (!dateI.value) { setError(dateI, 'Выберите дату и время'); ok = false; }
    else if (new Date(dateI.value) < new Date()) { setError(dateI, 'Выберите время в будущем'); ok = false; }
    if (!ok) return;

    var when = new Date(dateI.value).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    /* Здесь отправьте данные на сервер: fetch('/api/book', { method: 'POST', body: JSON.stringify({...}) }) */
    $('#okText').textContent = nameI.value.trim() + ', ждём вас ' + when + (target ? ' (' + target + ')' : '') + '. Мы перезвоним для подтверждения.';
    formView.hidden = true;
    okView.hidden = false;
  });

  /* doctor profiles */
  var DOCS = [
    { short: 'Дмитрий Караман', name: 'Дмитрий Иванович Караман', role: 'Врач-стоматолог, имплантолог-ортопед', exp: 'Стаж 25 лет',
      img: '/img/karaman.jpg',
      about: 'Самый опытный врач клиники. Специализируется на сложной имплантации и полном восстановлении зубных рядов. Выполнил более 2 500 операций и считает, что хорошее лечение — это то, которое пациент не замечает.',
      edu: ['Московский государственный медико-стоматологический университет, лечебное дело (2006–2011)', 'Ординатура по ортопедической стоматологии (2011–2013)', 'Стажировка по имплантологии, Мюнхен (2016)'],
      work: ['2013–2017 — врач-стоматолог-ортопед, частная клиника «Дента-Мед»', '2017–2020 — заведующий отделением имплантации', 'С 2020 — главный врач клиники «Диамант»'],
      spec: ['Имплантация', 'Протезирование', 'All-on-4', 'Синус-лифтинг', '3D-планирование'],
      extra: ['Международный конгресс по имплантологии (2023)', 'Курс цифрового протезирования CAD/CAM (2022)'] },
    { short: 'Евгений Липовцев', name: 'Евгений Сергеевич Липовцев', role: 'Врач-терапевт, эстетист', exp: 'Стаж 9 лет',
      img: '/img/lipovcec.jpg',
      about: 'Работает с микроскопом и создаёт реставрации, которые невозможно отличить от настоящих зубов. Особенно внимательна к пациентам, которые боятся лечения.',
      edu: ['Российский университет медицины, стоматология (2010–2015)', 'Интернатура по терапевтической стоматологии (2015–2016)', 'Школа эстетической реставрации, Санкт-Петербург (2018)'],
      work: ['2016–2019 — врач-стоматолог-терапевт, клиника «Улыбка»', '2019–2021 — ведущий эстетист, студия «Белый жемчуг»', 'С 2021 — врач-терапевт клиники «Диамант»'],
      spec: ['Лечение кариеса', 'Керамические виниры', 'Отбеливание', 'Эндодонтия под микроскопом', 'Профчистка'],
      extra: ['Курс «Художественная реставрация» (2022)', 'Сертификат по системам отбеливания (2024)'] },
    { short: 'Юрий Самойленко', name: 'Юрий Ильич Самойленко', role: 'Челюстно-лицевой хирург', exp: 'Стаж 11 лет',
      img: '/img/samoylenko.jpg',
      about: 'Проводит как плановые, так и сложные операции: удаление ретенированных зубов, костную пластику, хирургию воспалений. Спокойный и точный — пациенты называют его «хирургом без стресса».',
      edu: ['Первый МГМУ им. Сеченова, стоматология (2009–2014)', 'Ординатура по хирургической стоматологии (2014–2016)', 'Курс челюстно-лицевой хирургии, Вена (2019)'],
      work: ['2016–2020 — врач-хирург, городская стоматологическая поликлиника', '2020–2022 — хирург-имплантолог, клиника «Дента-Мед»', 'С 2022 — хирург клиники «Диамант»'],
      spec: ['Удаление зубов', 'Костная пластика', 'Резекция корня', 'Лечение воспалений', 'Пластика уздечек'],
      extra: ['Конференция по хирургической стоматологии (2023)', 'Курс безопасной анестезии (2024)'] },
    { short: 'Артур Бурносенко', name: 'Артур Анатольевич Бурносенко', role: 'Врач-ортодонт', exp: 'Стаж 8 лет',
      img: '/img/artur.jpg',
      about: 'Исправляет прикус у взрослых и подростков. Перед началом лечения показывает цифровую модель будущей улыбки, чтобы пациент заранее видел результат.',
      edu: ['Новосибирский государственный медицинский университет, стоматология (2011–2016)', 'Ординатура по ортодонтии (2016–2018)', 'Курс по лечению на элайнерах, Барселона (2020)'],
      work: ['2018–2021 — врач-ортодонт, центр «Прикус»', '2021–2023 — ортодонт, клиника «Ровные зубы»', 'С 2023 — врач-ортодонт клиники «Диамант»'],
      spec: ['Брекет-системы', 'Элайнеры', 'Исправление прикуса', 'Ретейнеры', 'Подростковая ортодонтия'],
      extra: ['Международный ортодонтический симпозиум (2023)', 'Курс цифровой ортодонтии (2024)'] }
  ];

  var profile = $('#profile'), profLast = null, profDoc = null;
  function fill(sel, arr, asChips) {
    $(sel).innerHTML = arr.map(function (t) { return asChips ? '<span>' + t + '</span>' : '<li>' + t + '</li>'; }).join('');
  }
  function openProfile(i) {
    var d = DOCS[i]; profDoc = d; profLast = document.activeElement;
    $('#pImg').src = d.img; $('#pImg').alt = d.name;
    $('#pExp').textContent = d.exp; $('#pName').textContent = d.name; $('#pRole').textContent = d.role; $('#pAbout').textContent = d.about;
    fill('#pEdu', d.edu); fill('#pWork', d.work); fill('#pSpec', d.spec, true); fill('#pExtra', d.extra);
    $('#pBook').textContent = 'Записаться к врачу: ' + d.short;
    $('.modal-box', profile).scrollTop = 0;
    profile.classList.add('open'); profile.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock');
  }
  function closeProfile(restore) {
    profile.classList.remove('open'); profile.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lock');
    if (restore !== false && profLast) profLast.focus();
  }
  $$('[data-profile]').forEach(function (b) {
    b.addEventListener('click', function () { openProfile(+b.dataset.profile); });
  });
  $$('[data-pclose]').forEach(function (b) { b.addEventListener('click', function () { closeProfile(); }); });
  $('#pBook').addEventListener('click', function () {
    var name = profDoc.short;
    closeProfile(false);
    lastFocus = profLast;
    openModal(name);
    lastFocus = profLast;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && profile.classList.contains('open')) closeProfile();
  });

  /* works albums: each card is an album with several photos */
  var works = $$('.work'), lbox = $('#lightbox'), lbImg = $('#lbImg'), thumbs = $('#lbThumbs');
  var aIdx = 0, cur = 0, lbLast = null, tx = null;
  var albums = works.map(function (w) {
    var extra = (w.dataset.photos || '').split('|').map(function (x) { return x.trim(); }).filter(Boolean);
    return [$('img', w).src].concat(extra);
  });
  function big(src) { return src.replace('w=700', 'w=1600'); }
  works.forEach(function (w, i) {
    var title = $('b', w).textContent, n = albums[i].length;
    if (n > 1) {
      var badge = document.createElement('span');
      badge.className = 'count';
      badge.innerHTML = '<i class="fa-regular fa-images"></i> ' + n + ' фото';
      w.appendChild(badge);
    }
    w.tabIndex = 0; w.setAttribute('role', 'button');
    w.setAttribute('aria-label', 'Открыть альбом: ' + title + ' (' + n + ' фото)');
    w.addEventListener('click', function () { openLb(i); });
    w.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLb(i); } });
  });
  function buildThumbs() {
    thumbs.innerHTML = '';
    albums[aIdx].forEach(function (src, k) {
      var t = document.createElement('button');
      t.type = 'button'; t.setAttribute('aria-label', 'Фото ' + (k + 1));
      t.innerHTML = '<img alt="" src="' + src + '">';
      t.addEventListener('click', function () { show(k); });
      thumbs.appendChild(t);
    });
  }
  function show(i, instant) {
    var list = albums[aIdx], w = works[aIdx];
    cur = (i + list.length) % list.length;
    var src = big(list[cur]);
    function apply() {
      lbImg.onload = function () { lbImg.classList.remove('out'); };
      lbImg.src = src; lbImg.alt = $('b', w).textContent + ', фото ' + (cur + 1);
      if (lbImg.complete) lbImg.classList.remove('out');
    }
    if (instant) apply(); else { lbImg.classList.add('out'); setTimeout(apply, 220); }
    $('#lbTitle').textContent = $('b', w).textContent;
    $('#lbSub').textContent = $('span', w).textContent;
    $('#lbCount').textContent = 'Фото ' + (cur + 1) + ' из ' + list.length;
    $$('button', thumbs).forEach(function (b, k) { b.classList.toggle('on', k === cur); });
    [1, -1].forEach(function (d) { var im = new Image(); im.src = big(list[(cur + d + list.length) % list.length]); });
  }
  function openLb(i) {
    lbLast = document.activeElement; aIdx = i;
    lbox.classList.toggle('lb-single', albums[i].length < 2);
    buildThumbs(); show(0, true);
    lbox.classList.add('open'); lbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lock');
    setTimeout(function () { $('.lb-close').focus(); }, 300);
  }
  function closeLb() {
    lbox.classList.remove('open'); lbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lock');
    if (lbLast) lbLast.focus();
  }
  $$('[data-lbclose]').forEach(function (b) { b.addEventListener('click', closeLb); });
  $('#lbPrev').addEventListener('click', function () { show(cur - 1); });
  $('#lbNext').addEventListener('click', function () { show(cur + 1); });
  document.addEventListener('keydown', function (e) {
    if (!lbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLb();
    else if (e.key === 'ArrowLeft') show(cur - 1);
    else if (e.key === 'ArrowRight') show(cur + 1);
  });
  lbox.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lbox.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) show(dx < 0 ? cur + 1 : cur - 1);
  });

  /* soft anchor scrolling: slow start, slow finish, duration grows with distance */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = null;
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function stopScroll() { if (raf) { cancelAnimationFrame(raf); raf = null; } }
  function softScrollTo(y) {
    stopScroll();
    var from = window.scrollY, dist = y - from;
    if (reduce || Math.abs(dist) < 2) { window.scrollTo(0, y); return; }
    var dur = Math.min(Math.max(900, 600 + Math.abs(dist) * 0.45), 1900), t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      window.scrollTo(0, from + dist * ease(p));
      raf = p < 1 ? requestAnimationFrame(step) : null;
    }
    raf = requestAnimationFrame(step);
  }
  $$('a[href^="#"]').forEach(function (a) {
    var id = a.getAttribute('href');
    if (id.length < 2) return;
    a.addEventListener('click', function (e) {
      var el = id === '#top' ? document.body : $(id);
      if (!el) return;
      e.preventDefault();
      var y = id === '#top' ? 0 : el.getBoundingClientRect().top + window.scrollY - 76;
      softScrollTo(Math.max(0, y));
      if (history.pushState) history.pushState(null, '', id);
    });
  });
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, stopScroll, { passive: true });
  });
})();

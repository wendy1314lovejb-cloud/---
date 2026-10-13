(() => {
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const projectList = $('#project-list');
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const safeHref = value => /^(https?:|mailto:|#)/i.test(String(value || '')) ? value : '#contact';

  function renderProfile(profile) {
    document.querySelectorAll('[data-name]').forEach(el => { el.textContent = profile.name || '你的名字'; });
    $('[data-location]').textContent = profile.location || '歡迎交流 · 合作洽談中';
    document.querySelectorAll('[data-role]').forEach(el => { el.textContent = profile.role || ''; });
    $('[data-intro]').textContent = profile.intro || '';
    $('[data-about]').textContent = profile.about || '';
    document.title = `${profile.name || '你的名字'} — 個人網站`;
    const emailLink = $('#email-link');
    if (profile.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      emailLink.href = `mailto:${profile.email}`;
      emailLink.innerHTML = `${escapeHTML(profile.email)} <span aria-hidden="true">↗</span>`;
    } else {
      emailLink.href = '#contact';
      emailLink.textContent = '聯絡方式尚未提供';
    }
    projectList.innerHTML = profile.projects?.length ? profile.projects.map(project => `
      <article class="project-card reveal">
        <span class="project-number">${escapeHTML(project.number)}</span>
        <div><span class="project-category">${escapeHTML(project.category)}</span><h3>${escapeHTML(project.title)}</h3><p class="project-description">${escapeHTML(project.description)}</p></div>
        <span class="project-year">${escapeHTML(project.year)}</span>
        <a class="project-arrow" href="${escapeHTML(safeHref(project.link))}" aria-label="${escapeHTML(project.linkLabel || '了解作品')}">↗</a>
      </article>`).join('') : '<p class="empty-projects">目前沒有公開作品，新的內容會在這裡更新。</p>';
    watchReveals();
  }

  async function loadProfile() {
    for (const url of ['/api/profile', './data/profile.json']) {
      try {
        const response = await fetch(url, { headers: { Accept: 'application/json' } });
        if (response.ok) return renderProfile(await response.json());
      } catch { /* Try the static JSON copy when the local API is unavailable. */ }
    }
    projectList.innerHTML = '<p class="form-note">目前無法載入作品資料，請稍後重新整理。</p>';
  }

  function watchReveals() {
    const elements = document.querySelectorAll('.project-card');
    if (reducedMotion || !('IntersectionObserver' in window)) { elements.forEach(el => el.classList.add('is-visible')); return; }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    elements.forEach(el => { el.classList.add('reveal'); observer.observe(el); });
  }

  const menuToggle = $('.menu-toggle');
  const nav = $('#primary-nav');
  function closeMenu() { menuToggle.setAttribute('aria-expanded', 'false'); menuToggle.setAttribute('aria-label', '開啟選單'); nav.classList.remove('is-open'); }
  menuToggle.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '關閉選單' : '開啟選單');
    nav.classList.toggle('is-open', open);
  });
  nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeMenu(); menuToggle.focus(); } });

  $('#contact-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const button = $('.submit-button', form);
    const status = $('#form-status');
    button.disabled = true;
    status.textContent = '正在送出……';
    status.removeAttribute('data-state');
    try {
      const response = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '送出失敗，請檢查欄位。');
      status.textContent = result.message;
      status.dataset.state = 'success';
      form.reset();
    } catch {
      status.textContent = '目前是靜態展示版，表單不會寄出或保存資料。你可以使用上方 Email 聯絡我。';
      status.dataset.state = 'error';
    } finally { button.disabled = false; }
  });

  if (!reducedMotion) {
    const canvas = $('.particle-canvas');
    const context = canvas.getContext('2d', { alpha: true });
    let width = 0, height = 0, particles = [], pointer = { x: -1000, y: -1000 }, frame = 0;
    const colors = ['194,165,255', '155,115,243', '217,197,255', '234,165,235'];
    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth; height = Math.min(document.documentElement.scrollHeight, 960);
      canvas.width = width * ratio; canvas.height = height * ratio; canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(74, Math.max(22, Math.floor(width / 17)));
      particles = Array.from({ length: count }, () => ({ x: Math.random() * width, y: Math.random() * height, vx: (Math.random() - .5) * .21, vy: (Math.random() - .5) * .21, r: Math.random() * 1.45 + .45, color: colors[Math.floor(Math.random() * colors.length)] }));
    }
    function draw() {
      context.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]; p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        const dx = pointer.x - p.x, dy = pointer.y - p.y, distance = Math.hypot(dx, dy);
        if (distance < 115) { p.x -= dx / distance * .18; p.y -= dy / distance * .18; }
        context.beginPath(); context.fillStyle = `rgba(${p.color}, .7)`; context.shadowColor = `rgba(${p.color}, .6)`; context.shadowBlur = 9;
        context.arc(p.x, p.y, p.r, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0;
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j], gap = Math.hypot(p.x - q.x, p.y - q.y);
          if (gap < 90) { context.beginPath(); context.strokeStyle = `rgba(154,190,226,${(1 - gap / 90) * .12})`; context.lineWidth = .6; context.moveTo(p.x, p.y); context.lineTo(q.x, q.y); context.stroke(); }
        }
      }
      frame = requestAnimationFrame(draw);
    }
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', event => { pointer = { x: event.clientX, y: event.clientY }; }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(frame); else draw(); });
    resize(); draw();
  }

  loadProfile();
})();

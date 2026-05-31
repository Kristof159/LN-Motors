// LN Motors — small interactions

// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
if (toggle && links) {
  toggle.addEventListener('click', () => links.classList.toggle('open'));
  links.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => links.classList.remove('open'))
  );
}

// Highlight the active nav item based on the current page
const here = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-links a').forEach(a => {
  const target = a.getAttribute('href');
  if (target === here || (here === 'index.html' && target === 'index.html')) {
    a.classList.add('active');
  }
});

// Stop demo forms from navigating away; show a friendly confirmation
document.querySelectorAll('form[data-demo]').forEach(form => {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const note = form.querySelector('.form-note');
    if (note) note.textContent = 'Bedankt! Uw bericht is verzonden (demo).';
    form.reset();
  });
});

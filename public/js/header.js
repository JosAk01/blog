document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });
});

const toggleButton = document.querySelector('.sidebar-toggle');
const sidebar = document.querySelector('.sidebar');

toggleButton.addEventListener('click', () => {
  sidebar.classList.toggle('hidden');
});

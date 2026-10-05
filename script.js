"use strict";

(() => {
  document.body.classList.add("js-enabled");

  const menuToggle = document.querySelector(".menu-toggle");
  const mobileNav = document.getElementById("mobile-nav");
  const mobileBreakpoint = window.matchMedia("(max-width: 760px)");
  const navigationBreakpoint = window.matchMedia("(max-width: 950px)");

  function closeMenu(returnFocus = false) {
    mobileNav.hidden = true;
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
    document.body.classList.remove("menu-open");
    if (returnFocus) menuToggle.focus();
  }

  function updateMenuVisibility() {
    menuToggle.hidden = !navigationBreakpoint.matches;
    closeMenu();
  }

  updateMenuVisibility();
  navigationBreakpoint.addEventListener("change", updateMenuVisibility);
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeMenu();
      return;
    }
    mobileNav.hidden = false;
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close navigation");
    document.body.classList.add("menu-open");
    mobileNav.querySelector("a").focus({ preventScroll: true });
  });

  mobileNav.addEventListener("click", (event) => {
    const link = event.target.closest("a");
    if (!link) return;
    closeMenu();
    const section = document.querySelector(link.getAttribute("href"));
    if (section) {
      section.setAttribute("tabindex", "-1");
      section.focus({ preventScroll: true });
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !mobileNav.hidden) closeMenu(true);
  });

  document.addEventListener("click", (event) => {
    if (!mobileNav.hidden && !event.target.closest(".site-header")) closeMenu();
  });

  const navLinks = document.querySelectorAll(".desktop-nav a");
  const sections = [...navLinks].map((link) => document.querySelector(link.getAttribute("href")));
  const header = document.querySelector(".site-header");
  let navigationFrame = null;

  function updateActiveSection() {
    navigationFrame = null;
    const fixedHeaderHeight = getComputedStyle(header).position === "sticky" ? header.offsetHeight : 0;
    const threshold = fixedHeaderHeight + Math.min(window.innerHeight * .2, 180);
    const atBottom = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    const active = atBottom ? sections[sections.length - 1] : [...sections].reverse().find((section) => section.getBoundingClientRect().top <= threshold);
    navLinks.forEach((link) => {
      if (active && link.getAttribute("href") === `#${active.id}`) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function scheduleNavigationUpdate() {
    if (navigationFrame === null) navigationFrame = window.requestAnimationFrame(updateActiveSection);
  }

  window.addEventListener("scroll", scheduleNavigationUpdate, { passive: true });
  window.addEventListener("resize", scheduleNavigationUpdate);
  updateActiveSection();

  const mobileContactBar = document.querySelector(".mobile-contact-bar");
  let heroActionsVisible = true;
  let contactVisible = false;

  function updateMobileContactBar() {
    mobileContactBar.hidden = !mobileBreakpoint.matches || heroActionsVisible || contactVisible;
  }

  if ("IntersectionObserver" in window) {
    const contactBarObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target.matches(".hero-actions")) heroActionsVisible = entry.isIntersecting;
        if (entry.target.id === "contact") contactVisible = entry.isIntersecting;
      });
      updateMobileContactBar();
    });
    contactBarObserver.observe(document.querySelector(".hero-actions"));
    contactBarObserver.observe(document.getElementById("contact"));
  }
  mobileBreakpoint.addEventListener("change", updateMobileContactBar);

  document.querySelectorAll(".project-carousel").forEach((carousel) => {
    const viewport = carousel.querySelector(".carousel-viewport");
    const slides = [...carousel.querySelectorAll(".carousel-slide")];
    const controls = carousel.querySelector(".carousel-controls");
    const position = carousel.querySelector("[data-carousel-position]");
    const feedback = carousel.querySelector(".carousel-feedback");
    let current = 0;
    let requested = 0;
    let requestId = 0;
    let swipeStart = null;

    function frameSlide(slide) {
      const frame = slide.querySelector(".carousel-image-frame");
      const image = frame.querySelector("img");
      const width = Number(image.getAttribute("width"));
      const height = Number(image.getAttribute("height"));
      const scale = Math.min((viewport.clientWidth - 24) / width, (viewport.clientHeight - 24) / height);
      if (scale <= 0) return;

      // Web copies already contain the selected crop and orientation.
      // Fit uniformly and tell the browser the actual displayed width.
      frame.style.width = `${width * scale}px`;
      frame.style.height = `${height * scale}px`;
      image.sizes = `${Math.ceil(width * scale)}px`;
      slide.classList.add("is-framed");
    }

    function loadSlide(slide) {
      const image = slide.querySelector(".carousel-image-frame img");
      frameSlide(slide);
      if (image.dataset.srcset) image.srcset = image.dataset.srcset;
      if (image.complete && image.naturalWidth) return Promise.resolve();
      return new Promise((resolve, reject) => {
        function cleanup() {
          image.removeEventListener("load", onLoad);
          image.removeEventListener("error", onError);
        }
        function onLoad() { cleanup(); resolve(); }
        function onError() { cleanup(); reject(new Error("Image unavailable")); }
        image.addEventListener("load", onLoad);
        image.addEventListener("error", onError);
        image.loading = "eager";
        image.fetchPriority = "auto";
        image.src = image.dataset.src || image.getAttribute("src");
      });
    }

    async function showSlide(index) {
      requested = (index + slides.length) % slides.length;
      const target = requested;
      const token = ++requestId;
      feedback.hidden = true;
      viewport.setAttribute("aria-busy", "true");
      try {
        await loadSlide(slides[target]);
        if (token !== requestId) return;
        slides.forEach((slide, i) => { slide.hidden = i !== target; });
        current = target;
        frameSlide(slides[current]);
        position.textContent = String(current + 1);
      } catch {
        if (token !== requestId) return;
        requested = current;
        feedback.textContent = "This image could not load. Try another image.";
        feedback.hidden = false;
      } finally {
        if (token === requestId) viewport.removeAttribute("aria-busy");
      }
    }

    viewport.tabIndex = 0;
    viewport.setAttribute("aria-label", "Project images; use left and right arrow keys to browse");
    controls.hidden = false;
    carousel.querySelector(".carousel-count").hidden = false;
    controls.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => showSlide(requested + Number(button.dataset.direction)));
    });
    carousel.addEventListener("keydown", (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const destinations = { ArrowLeft: requested - 1, ArrowRight: requested + 1, Home: 0, End: slides.length - 1 };
      if (!(event.key in destinations)) return;
      event.preventDefault();
      showSlide(destinations[event.key]);
    });
    viewport.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" || !event.isPrimary || event.target.closest(".carousel-controls")) return;
      swipeStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
      viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener("pointerup", (event) => {
      if (!swipeStart || event.pointerId !== swipeStart.id) return;
      const dx = event.clientX - swipeStart.x;
      const dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.25) showSlide(requested + (dx < 0 ? 1 : -1));
    });
    viewport.addEventListener("pointercancel", () => { swipeStart = null; });
    frameSlide(slides[current]);
    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(() => frameSlide(slides[current]));
      resizeObserver.observe(viewport);
    } else {
      window.addEventListener("resize", () => frameSlide(slides[current]));
    }
  });

  const form = document.getElementById("contact-form");
  const result = document.getElementById("form-result");
  const status = document.getElementById("form-status");
  const draftLink = document.getElementById("email-draft-link");
  const copyButton = document.getElementById("copy-message");
  const copyFallback = document.getElementById("copy-fallback");
  const recipient = "contact@initialhw.com";
  let emailText = "";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const nameInput = document.getElementById("name");
    const name = nameInput.value.trim();
    const email = document.getElementById("email").value.trim();
    const messageInput = document.getElementById("message");
    const message = messageInput.value.trim();

    if (!name) {
      nameInput.setCustomValidity("Please add your name.");
      nameInput.reportValidity();
      nameInput.addEventListener("input", () => nameInput.setCustomValidity(""), { once: true });
      return;
    }

    if (!message) {
      messageInput.setCustomValidity("Please add a short project outline.");
      messageInput.reportValidity();
      messageInput.addEventListener("input", () => messageInput.setCustomValidity(""), { once: true });
      return;
    }

    const subject = "Electronics project inquiry";
    const body = `Hi George,\n\n${message}\n\nName: ${name}\nContact email: ${email}`;
    const draftUrl = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    emailText = `To: ${recipient}\nSubject: ${subject}\n\n${body}`;
    draftLink.href = draftUrl;
    copyFallback.value = emailText;
    copyFallback.hidden = true;
    result.hidden = false;
    status.textContent = "Your draft is ready. Review and send it in your email app, or use Open email draft or Copy message below.";
    window.location.href = draftUrl;
  });

  // This form prepares a local email draft. Enable it only after its submit
  // handler is attached, so it cannot post visitor details to the static site.
  form.querySelector(".form-submit").disabled = false;

  copyButton.addEventListener("click", async () => {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error("Clipboard is unavailable");
      await navigator.clipboard.writeText(emailText);
      status.textContent = "Copied. Paste into your email app and send to contact@initialhw.com.";
    } catch {
      copyFallback.hidden = false;
      copyFallback.focus();
      copyFallback.select();
      status.textContent = "Copy the details below and send them to contact@initialhw.com.";
    }
  });

  document.getElementById("copyright-year").textContent = new Date().getFullYear();
})();

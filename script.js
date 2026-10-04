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

  document.querySelectorAll(".project-image-swap").forEach((figure) => {
    const imageButton = figure.querySelector(".project-media-switch");
    const photo = figure.querySelector(".project-image-primary");
    const render = figure.querySelector(".project-image-render");
    const hoverTarget = figure.closest(".project-card");
    let selectedView = null;
    let hovering = false;

    function updateImage() {
      const showRender = selectedView === null ? hovering : selectedView;
      figure.classList.toggle("is-render", showRender);
      figure.classList.toggle("is-photo", selectedView === false);
      photo.setAttribute("aria-hidden", String(showRender));
      render.setAttribute("aria-hidden", String(!showRender));
      imageButton.setAttribute("aria-label", showRender ? "Show Aurora assembled prototype" : "Show Aurora design render");
      imageButton.setAttribute("aria-pressed", String(showRender));
    }

    imageButton.addEventListener("click", () => {
      const currentView = selectedView === null ? hovering : selectedView;
      selectedView = !currentView;
      updateImage();
    });
    hoverTarget.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "mouse") return;
      hovering = true;
      selectedView = null;
      updateImage();
    });
    hoverTarget.addEventListener("pointerleave", (event) => {
      if (event.pointerType !== "mouse") return;
      hovering = false;
      selectedView = null;
      updateImage();
    });
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

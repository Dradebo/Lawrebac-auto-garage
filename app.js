const form = document.getElementById("request-form");
const statusCard = document.getElementById("request-status");
const serviceInput = document.getElementById("service-input");
const servicePicks = [...document.querySelectorAll(".service-pick")];
const submitButton = document.getElementById("request-submit");
const carouselTrack = document.getElementById("garage-carousel-track");
const carouselSlides = [...document.querySelectorAll(".carousel-slide")];
const carouselDots = document.getElementById("carousel-dots");
const carouselCurrent = document.getElementById("carousel-current");
const carouselTotal = document.getElementById("carousel-total");
const carouselPrev = document.querySelector("[data-carousel-prev]");
const carouselNext = document.querySelector("[data-carousel-next]");

const LAWRENCE_PHONE = "256750200072";
const EMAIL = "lawrebacautogarage@gmail.com";
let carouselIndex = 0;

initCarousel();
updateSubmitState();

servicePicks.forEach((button) => {
  button.addEventListener("click", () => {
    serviceInput.value = button.dataset.service || "";
    servicePicks.forEach((item) => item.classList.toggle("is-selected", item === button));
    updateStatus();
    updateSubmitState();
  });
});

["name", "phone", "vehicle", "timing", "issue"].forEach((fieldName) => {
  const field = form.elements.namedItem(fieldName);
  if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLTextAreaElement)) {
    return;
  }

  field.addEventListener("input", () => {
    updateStatus();
    updateSubmitState();
  });
});

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!isReady()) {
    updateStatus();
    updateSubmitState();
    return;
  }

  const data = new FormData(form);
  const payload = {
    issue: clean(data.get("issue")),
    name: clean(data.get("name")),
    phone: sanitizePhone(data.get("phone")),
    reference: makeReference(),
    service: clean(data.get("service")),
    timing: clean(data.get("timing")),
    vehicle: clean(data.get("vehicle")),
  };

  const emailHref = makeEmailHref(payload);
  const whatsappHref = makeWhatsAppHref(payload);

  window.location.href = emailHref;
  statusCard.innerHTML = `
    <p class="card-kicker">Email ready</p>
    <h4>Your email app should be open.</h4>
    <p><strong>Reference:</strong> ${payload.reference}</p>
    <p>The request is addressed to ${EMAIL}. Send it from your email app so the garage can reply directly.</p>
    <div class="request-status-actions">
      <a class="button button-primary" href="${emailHref}">Open email again</a>
      <a class="button button-soft" href="${whatsappHref}" target="_blank" rel="noreferrer">WhatsApp fallback</a>
      <a class="button button-ghost" href="tel:+${LAWRENCE_PHONE}">Call Lawrence</a>
    </div>
  `;
});

function updateSubmitState() {
  submitButton.disabled = !isReady();
  submitButton.textContent = isReady() ? "Email request to Lawrebac" : "Complete details to email";
}

function updateStatus() {
  if (!serviceInput.value) {
    setStatus("Choose a service to start.", "The email button activates after all request details are filled.");
    return;
  }

  if (!hasRequiredDetails()) {
    setStatus("Add the remaining details.", "Name, phone, vehicle, preferred timing, and issue description are needed for a useful email.");
    return;
  }

  setStatus("Ready to email.", "Press the button to open a complete email request addressed to Lawrebac Auto Garage.");
}

function setStatus(title, message) {
  statusCard.innerHTML = `
    <p class="card-kicker">Email request</p>
    <h4>${title}</h4>
    <p>${message}</p>
  `;
}

function isReady() {
  return Boolean(serviceInput.value && hasRequiredDetails());
}

function hasRequiredDetails() {
  const name = clean(form.elements.namedItem("name")?.value);
  const phone = sanitizePhone(form.elements.namedItem("phone")?.value);
  const vehicle = clean(form.elements.namedItem("vehicle")?.value);
  const timing = clean(form.elements.namedItem("timing")?.value);
  const issue = clean(form.elements.namedItem("issue")?.value);

  return name.length >= 2 && phone.length >= 10 && vehicle.length >= 2 && timing.length >= 2 && issue.length >= 6;
}

function makeReference() {
  const pool = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";

  for (let index = 0; index < 6; index += 1) {
    suffix += pool[Math.floor(Math.random() * pool.length)];
  }

  return `LAG-${suffix}`;
}

function clean(value) {
  return String(value || "").trim();
}

function sanitizePhone(value) {
  const cleaned = String(value || "").replace(/\D+/g, "");

  if (cleaned.startsWith("0")) {
    return `256${cleaned.slice(1)}`;
  }

  if (cleaned.startsWith("256")) {
    return cleaned;
  }

  return cleaned;
}

function makeEmailHref(payload) {
  const subject = `Lawrebac service request ${payload.reference}`;
  const lines = [
    "Hello Lawrebac Auto Garage,",
    "",
    "I would like to request vehicle service.",
    "",
    `Reference: ${payload.reference}`,
    `Name: ${payload.name}`,
    `Phone: ${payload.phone}`,
    `Vehicle: ${payload.vehicle}`,
    `Service: ${payload.service}`,
    `Preferred timing: ${payload.timing}`,
    "",
    "Issue description:",
    payload.issue,
    "",
    "Please call or reply to confirm the best time to bring the vehicle in.",
  ];

  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

function makeWhatsAppHref(payload) {
  const lines = [
    "Hello Lawrence, I would like to request vehicle service at Lawrebac Auto Garage.",
    `Reference: ${payload.reference}`,
    `Name: ${payload.name}`,
    `Phone: ${payload.phone}`,
    `Vehicle: ${payload.vehicle}`,
    `Service: ${payload.service}`,
    `Preferred timing: ${payload.timing}`,
    `Issue: ${payload.issue}`,
  ];

  return `https://wa.me/${LAWRENCE_PHONE}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function initCarousel() {
  if (!carouselTrack || carouselSlides.length === 0 || !carouselDots) {
    return;
  }

  carouselTotal.textContent = String(carouselSlides.length);
  carouselSlides.forEach((_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", `Show garage photo ${index + 1}`);
    button.addEventListener("click", () => showCarouselSlide(index));
    carouselDots.appendChild(button);
  });

  carouselPrev?.addEventListener("click", () => showCarouselSlide(carouselIndex - 1));
  carouselNext?.addEventListener("click", () => showCarouselSlide(carouselIndex + 1));

  showCarouselSlide(0);
}

function showCarouselSlide(nextIndex) {
  if (!carouselTrack || carouselSlides.length === 0) {
    return;
  }

  carouselIndex = (nextIndex + carouselSlides.length) % carouselSlides.length;
  carouselTrack.style.transform = `translateX(-${carouselIndex * 100}%)`;
  carouselCurrent.textContent = String(carouselIndex + 1);

  [...carouselDots.children].forEach((dot, index) => {
    dot.classList.toggle("is-active", index === carouselIndex);
    dot.setAttribute("aria-current", index === carouselIndex ? "true" : "false");
  });
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

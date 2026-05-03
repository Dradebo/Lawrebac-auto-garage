const form = document.getElementById("request-form");
const statusCard = document.getElementById("request-status");
const serviceInput = document.getElementById("service-input");
const slotDateInput = document.getElementById("slot-date-input");
const slotTimeInput = document.getElementById("slot-time-input");
const servicePicks = [...document.querySelectorAll(".service-pick")];
const dayGrid = document.getElementById("day-grid");
const slotGrid = document.getElementById("slot-grid");
const scheduleMonth = document.getElementById("schedule-month");
const selectedDayLabel = document.getElementById("selected-day-label");
const summaryService = document.getElementById("summary-service");
const summaryDay = document.getElementById("summary-day");
const summarySlot = document.getElementById("summary-slot");
const summaryDetails = document.getElementById("summary-details");
const progressService = document.getElementById("progress-service");
const progressSchedule = document.getElementById("progress-schedule");
const progressDetails = document.getElementById("progress-details");
const progressCopy = document.getElementById("request-progress-copy");
const submitButton = document.getElementById("request-submit");

const LAWRENCE_PHONE = "256750200072";
const EMAIL = "lawrebacautogarage@gmail.com";
const SLOT_BLUEPRINT = [
  { label: "08:30 AM", state: "open" },
  { label: "10:00 AM", state: "booked" },
  { label: "11:30 AM", state: "open" },
  { label: "01:30 PM", state: "limited" },
  { label: "03:00 PM", state: "open" },
  { label: "04:30 PM", state: "booked" },
];

let selectedDateIndex = -1;
let selectedSlot = "";

const days = buildDays();

scheduleMonth.textContent = "Waiting for day selection";
renderDays();
renderSlots();
updateSummary();
updateProgress();
updateStatus(currentStatusMessage());
updateSubmitState();

servicePicks.forEach((button) => {
  button.addEventListener("click", () => {
    const service = button.dataset.service || "";
    serviceInput.value = service;

    servicePicks.forEach((item) => item.classList.toggle("is-selected", item === button));
    updateSummary();
    updateProgress();
    updateStatus("Choose a day first, then pick a preferred time to continue.");
    updateSubmitState();
  });
});

["name", "phone", "vehicle", "issue"].forEach((fieldName) => {
  const field = form.elements.namedItem(fieldName);
  if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLTextAreaElement)) {
    return;
  }

  field.addEventListener("input", () => {
    updateSummary();
    updateProgress();
    updateStatus(currentStatusMessage());
    updateSubmitState();
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!serviceInput.value || !slotDateInput.value || !slotTimeInput.value || !hasRequiredDetails()) {
    updateStatus(currentStatusMessage());
    updateProgress();
    updateSubmitState();
    return;
  }

  const data = new FormData(form);
  const reference = makeReference();
  const payload = {
    issue: String(data.get("issue") || "").trim(),
    name: String(data.get("name") || "").trim(),
    phone: sanitizePhone(data.get("phone")),
    reference,
    service: String(data.get("service") || "").trim(),
    slotDate: String(data.get("slotDate") || "").trim(),
    slotTime: String(data.get("slotTime") || "").trim(),
    vehicle: String(data.get("vehicle") || "").trim(),
  };

  submitButton.disabled = true;
  submitButton.textContent = "Opening email...";
  updateStatus("Opening your email app with the full appointment request addressed to Lawrebac Auto Garage...");

  const emailHref = makeEmailHref(reference, payload);
  const whatsappHref = makeWhatsAppHref(reference, payload);
  window.location.href = emailHref;

  setStatus(
    "Your email request is ready to send.",
    reference,
    `${payload.name} prepared this request: ${payload.service} for ${payload.vehicle || "vehicle"} on ${payload.slotDate} at ${payload.slotTime}. Send the email that just opened so Lawrence can review the issue and confirm the best arrival time directly.`,
    whatsappHref,
    emailHref
  );
  form.reset();
  serviceInput.value = "";
  slotDateInput.value = "";
  slotTimeInput.value = "";
  selectedSlot = "";
  selectedDateIndex = -1;
  servicePicks.forEach((item) => item.classList.remove("is-selected"));
  renderDays();
  renderSlots();
  updateSummary();
  updateProgress();
  submitButton.disabled = false;
  submitButton.textContent = "Send request by email";
  updateSubmitState();
});

function buildDays() {
  const formatterMonth = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });
  const formatterWeekday = new Intl.DateTimeFormat("en-US", { weekday: "short" });
  const formatterFull = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return Array.from({ length: 10 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);

    return {
      iso: date.toISOString().slice(0, 10),
      fullLabel: formatterFull.format(date),
      monthLabel: formatterMonth.format(date),
      dayNumber: String(date.getDate()),
      weekday: formatterWeekday.format(date),
    };
  });
}

function buildSlots(selectedIndex) {
  return SLOT_BLUEPRINT.map((slot, index) => {
    if ((selectedIndex + index) % 5 === 0) {
      return { ...slot, state: "booked" };
    }

    if ((selectedIndex + index) % 3 === 0) {
      return { ...slot, state: "limited" };
    }

    return { ...slot, state: "open" };
  });
}

function renderDays() {
  dayGrid.innerHTML = "";

  days.forEach((day, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `day-card ${index === selectedDateIndex ? "is-selected" : ""}`;
    button.innerHTML = `<span>${day.weekday}</span><strong>${day.dayNumber}</strong><small>${day.monthLabel.slice(0, 3)}</small>`;
    button.addEventListener("click", () => {
      selectedDateIndex = index;
      selectedSlot = "";
      slotDateInput.value = day.fullLabel;
      slotTimeInput.value = "";
      renderDays();
      renderSlots();
      updateSummary();
      updateProgress();
      updateStatus("Choose your preferred time to continue.");
      updateSubmitState();
    });
    dayGrid.appendChild(button);
  });

  if (selectedDateIndex >= 0) {
    scheduleMonth.textContent = days[selectedDateIndex].monthLabel;
    slotDateInput.value = days[selectedDateIndex].fullLabel;
    selectedDayLabel.textContent = days[selectedDateIndex].fullLabel;
    return;
  }

  scheduleMonth.textContent = "Waiting for day selection";
  slotDateInput.value = "";
  selectedDayLabel.textContent = "Choose a day first";
}

function renderSlots() {
  slotGrid.innerHTML = "";
  if (selectedDateIndex < 0) {
    slotGrid.innerHTML = `
      <article class="slot-empty">
        <p class="card-kicker">Next step</p>
        <p>Choose a day first, then the preferred time options will appear here.</p>
      </article>
    `;
    return;
  }

  const slots = buildSlots(selectedDateIndex);

  slots.forEach((slot) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `slot-card is-${slot.state} ${selectedSlot === slot.label ? "is-selected" : ""}`;
    button.disabled = slot.state === "booked";
    button.innerHTML = `<span>${slot.label}</span><small>${slot.state === "booked" ? "Busy" : slot.state === "limited" ? "Limited" : "Preferred"}</small>`;
    button.addEventListener("click", () => {
      selectedSlot = slot.label;
      slotTimeInput.value = slot.label;
      renderSlots();
      updateSummary();
      updateProgress();
      updateStatus("Everything looks good. Save the request and the garage will confirm the best available appointment with you.");
      updateSubmitState();
    });
    slotGrid.appendChild(button);
  });
}

function updateSummary() {
  summaryService.textContent = serviceInput.value || "Choose a service";
  summaryDay.textContent = slotDateInput.value || "Choose a day";
  summarySlot.textContent = slotTimeInput.value || "Choose a preferred time";
  summaryDetails.textContent = hasRequiredDetails() ? "Details ready" : "Add your name, phone, vehicle, and issue";
}

function updateSubmitState() {
  const ready = Boolean(serviceInput.value && slotDateInput.value && slotTimeInput.value && hasRequiredDetails());
  submitButton.disabled = !ready;
  submitButton.textContent = ready ? "Send request by email" : "Choose service, schedule, and details";
}

function updateStatus(message) {
  statusCard.innerHTML = `
    <p class="card-kicker">Appointment request</p>
    <h4>${currentStatusTitle()}</h4>
    <p>${message}</p>
  `;
}

function updateProgress() {
  const hasService = Boolean(serviceInput.value);
  const hasSchedule = Boolean(slotDateInput.value && slotTimeInput.value);
  const hasDetails = hasRequiredDetails();

  setProgressState(progressService, hasService ? "done" : "active");
  setProgressState(progressSchedule, !hasService ? "pending" : hasSchedule ? "done" : "active");
  setProgressState(progressDetails, !hasService || !hasSchedule ? "pending" : hasDetails ? "done" : "active");
  progressCopy.textContent = currentStatusMessage();
}

function currentStatusMessage() {
  if (!serviceInput.value) {
    return "Start with the service closest to your vehicle problem so the garage can review the request faster.";
  }

  if (!slotDateInput.value) {
    return "Choose the day that works best so the garage can start planning an arrival window for you.";
  }

  if (!slotTimeInput.value) {
    return "Pick the preferred time that best matches when you can bring the vehicle in.";
  }

  if (!hasRequiredDetails()) {
    return "Add your name, phone, vehicle, and issue so Lawrence can understand the problem before calling you back.";
  }

  return "Everything is ready. Send the request by email and expect a direct call or message from the garage after review.";
}

function currentStatusTitle() {
  if (!serviceInput.value) {
    return "Start the request";
  }

  if (!slotDateInput.value || !slotTimeInput.value) {
    return "Choose the schedule";
  }

  if (!hasRequiredDetails()) {
    return "Add your details";
  }

  return "Ready to email";
}

function hasRequiredDetails() {
  const name = String(form.elements.namedItem("name")?.value || "").trim();
  const phone = sanitizePhone(form.elements.namedItem("phone")?.value || "");
  const vehicle = String(form.elements.namedItem("vehicle")?.value || "").trim();
  const issue = String(form.elements.namedItem("issue")?.value || "").trim();

  return name.length >= 2 && phone.length >= 10 && vehicle.length >= 2 && issue.length >= 6;
}

function setProgressState(element, state) {
  element.classList.remove("is-pending", "is-active", "is-done");
  element.classList.add(`is-${state}`);
}

function makeReference() {
  const pool = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";

  for (let index = 0; index < 6; index += 1) {
    suffix += pool[Math.floor(Math.random() * pool.length)];
  }

  return `LAG-${suffix}`;
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

function makeWhatsAppHref(reference, payload) {
  const lines = [
    "Hello Lawrence, I would like to book a vehicle service at Lawrebac Auto Garage.",
    `Reference: ${reference}`,
    `Name: ${payload.name}`,
    `Phone: ${payload.phone}`,
    `Vehicle: ${payload.vehicle}`,
    `Service: ${payload.service}`,
    `Preferred day: ${payload.slotDate}`,
    `Preferred time: ${payload.slotTime}`,
    `Issue: ${payload.issue}`,
  ];

  return `https://wa.me/${LAWRENCE_PHONE}?text=${encodeURIComponent(lines.join("\n"))}`;
}

function makeEmailHref(reference, payload) {
  const subject = `Lawrebac booking request ${reference}`;
  const lines = [
    "Hello Lawrebac Auto Garage,",
    "",
    "I would like to book a vehicle service appointment.",
    "",
    `Reference: ${reference}`,
    `Name: ${payload.name}`,
    `Phone: ${payload.phone}`,
    `Vehicle: ${payload.vehicle}`,
    `Service: ${payload.service}`,
    `Preferred day: ${payload.slotDate}`,
    `Preferred time: ${payload.slotTime}`,
    "",
    "Issue description:",
    payload.issue,
    "",
    "Please call or reply to confirm the best arrival time.",
  ];

  return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
}

function setStatus(message, reference, details, whatsappHref, emailHref) {
  statusCard.innerHTML = `
    <p class="card-kicker">Appointment request</p>
    <h4>${message}</h4>
    <p><strong>Reference:</strong> ${reference}</p>
    <p>${details}</p>
    <p><strong>What happens next:</strong> the garage reviews the issue, checks workshop load, and usually calls or messages back within one working day to confirm timing or adjust the slot.</p>
    <div class="request-status-actions">
      <a class="button button-primary" href="tel:+${LAWRENCE_PHONE}">Call Lawrence</a>
      <a class="button button-soft" href="${whatsappHref}" target="_blank" rel="noreferrer">WhatsApp fallback</a>
      <a class="button button-ghost" href="${emailHref}">Open email again</a>
    </div>
  `;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

const $ = (selector) => document.querySelector(selector);
const output = $("#console-output");
const state = { user: null, session: null };

function apiUrl(path) {
  return `${$("#api-url").value.replace(/\/$/, "")}${path}`;
}

function print(label, value) {
  output.textContent = `${label}\n${JSON.stringify(value, null, 2)}`;
}

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    ...options,
    headers: options.body instanceof FormData
      ? options.headers
      : { "Content-Type": "application/json", ...options.headers },
  });
  const text = await response.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch { /* resposta textual */ }
  print(`${options.method ?? "GET"} ${path} — HTTP ${response.status}`, body);
  if (!response.ok) throw new Error(body?.error?.message ?? body?.message ?? `HTTP ${response.status}`);
  return body;
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function filesToForm(files, field = "images") {
  const data = new FormData();
  [...files].slice(0, 3).forEach((file) => data.append(field, file));
  return data;
}

function updateSession(session) {
  state.user = session?.user ?? null;
  state.session = session?.session ?? null;
  $("#session-label").textContent = state.user
    ? `${state.user.name} — ${state.user.email}`
    : "Não autenticado";
  $("#role-badge").textContent = state.user?.role ?? "";
  $("#role-badge").classList.toggle("hidden", !state.user);
  $("#logout-button").classList.toggle("hidden", !state.user);
}

async function refreshSession() {
  try { updateSession(await request("/auth/me")); }
  catch { updateSession(null); }
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab, .panel").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    $(`#${tab.dataset.panel}`).classList.add("active");
  });
});

$("#health-button").addEventListener("click", () => request("/health").catch(() => {}));
$("#clear-console").addEventListener("click", () => { output.textContent = ""; });
$("#logout-button").addEventListener("click", async () => {
  try { await request("/api/auth/sign-out", { method: "POST", body: "{}" }); }
  finally { updateSession(null); }
});

$("#signup-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("/api/auth/sign-up/email", { method: "POST", body: JSON.stringify(formObject(event.currentTarget)) });
    await refreshSession();
  } catch { /* exibido no console */ }
});

$("#signin-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("/api/auth/sign-in/email", { method: "POST", body: JSON.stringify(formObject(event.currentTarget)) });
    await refreshSession();
  } catch { /* exibido no console */ }
});

$("#report-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = formObject(event.currentTarget);
  const payload = {
    fullName: data.fullName,
    age: data.age ? Number(data.age) : undefined,
    birthPlace: data.birthPlace || undefined,
    parentNames: data.parentNames ? data.parentNames.split(",").map((item) => item.trim()).filter(Boolean) : undefined,
    lastSeenAddress: data.lastSeenAddress || undefined,
  };
  try { await request("/reports/missing", { method: "POST", body: JSON.stringify(payload) }); event.currentTarget.reset(); }
  catch { /* exibido no console */ }
});

async function loadReports(query = {}) {
  const params = new URLSearchParams(Object.entries(query).filter(([, value]) => value));
  try {
    const data = await request(`/reports/missing?${params}`);
    $("#reports-list").innerHTML = data.items.map((item) => `
      <article class="list-item"><strong>${item.fullName}</strong>
        <p>${item.status} · ${item.age ?? "idade desconhecida"}</p>
        <code>${item.id}</code>
        <div class="actions">
          <button data-report-id="${item.id}" data-status="FOUND">Marcar encontrado</button>
          <button data-report-id="${item.id}" data-status="ARCHIVED" class="secondary">Arquivar</button>
        </div>
      </article>`).join("") || "<p>Nenhuma ficha.</p>";
  } catch { /* exibido no console */ }
}

$("#report-search-form").addEventListener("submit", (event) => {
  event.preventDefault(); loadReports(formObject(event.currentTarget));
});
$("#reports-list").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-report-id]");
  if (!button) return;
  try {
    await request(`/reports/missing/${button.dataset.reportId}/status`, {
      method: "PATCH", body: JSON.stringify({ status: button.dataset.status }),
    });
    await loadReports();
  } catch { /* exibido no console */ }
});

$("#institution-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try { await request("/institutions", { method: "POST", body: JSON.stringify(formObject(event.currentTarget)) }); }
  catch { /* exibido no console */ }
});
$("#load-institution").addEventListener("click", async () => {
  try {
    const item = await request("/institutions/me");
    $("#institution-view").innerHTML = `<article class="list-item"><strong>${item.name}</strong><p>${item.status}</p><p>${item.legalName}</p><code>${item.id}</code></article>`;
  } catch { /* exibido no console */ }
});

$("#sheltered-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = formObject(event.currentTarget);
  try {
    await request("/sheltered-people", { method: "POST", body: JSON.stringify({
      fullName: data.fullName, approxAge: data.approxAge || undefined, foundLocation: data.foundLocation || undefined,
    }) });
    event.currentTarget.reset(); await loadSheltered();
  } catch { /* exibido no console */ }
});

async function loadSheltered() {
  try {
    const include = $("#include-archived").checked;
    const items = await request(`/sheltered-people?includeArchived=${include}`);
    $("#sheltered-list").innerHTML = items.map((item) => `
      <article class="list-item"><strong>${item.fullName}</strong>
        <p>${item.status}${item.archivedAt ? " · ARQUIVADO" : ""}</p>
        <p>${item.approxAge ?? "idade desconhecida"} · ${item.foundLocation ?? "local desconhecido"}</p>
        <code>${item.id}</code>
        <div class="actions">
          ${item.archivedAt
            ? `<button data-sheltered-action="restore" data-id="${item.id}">Restaurar</button>`
            : `<button data-sheltered-action="identify" data-id="${item.id}">Identificado</button><button class="danger" data-sheltered-action="archive" data-id="${item.id}">Arquivar</button>`}
        </div>
      </article>`).join("") || "<p>Nenhuma pessoa cadastrada.</p>";
  } catch { /* exibido no console */ }
}
$("#load-sheltered").addEventListener("click", loadSheltered);
$("#include-archived").addEventListener("change", loadSheltered);
$("#sheltered-list").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-sheltered-action]");
  if (!button) return;
  const { id, shelteredAction: action } = button.dataset;
  try {
    if (action === "archive") await request(`/sheltered-people/${id}`, { method: "DELETE" });
    if (action === "restore") await request(`/sheltered-people/${id}/restore`, { method: "POST", body: "{}" });
    if (action === "identify") await request(`/sheltered-people/${id}`, { method: "PATCH", body: JSON.stringify({ status: "IDENTIFIED" }) });
    await loadSheltered();
  } catch { /* exibido no console */ }
});

$("#reference-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = filesToForm(form.elements.images.files);
  try { await request(`/matching/references/${form.elements.ownerType.value}/${form.elements.ownerId.value}`, { method: "POST", body: data }); }
  catch { /* exibido no console */ }
});

$("#matching-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = filesToForm(form.elements.images.files);
  try {
    const result = await request(`/matching/search?threshold=${form.elements.threshold.value}&limit=${form.elements.limit.value}`, { method: "POST", body: data });
    $("#matching-results").innerHTML = `<h2>Resultados (${result.processedImages} foto(s))</h2>` +
      (result.candidates.map((item) => `<article class="list-item"><strong>${(item.similarity * 100).toFixed(2)}%</strong><p>${item.ownerType}</p><code>${item.ownerId}</code></article>`).join("") || "<p>Nenhum candidato.</p>");
  } catch { /* exibido no console */ }
});

async function loadAdminInstitutions() {
  const status = $("#admin-status-filter").value;
  try {
    const items = await request(`/institutions/admin${status ? `?status=${status}` : ""}`);
    $("#admin-institutions-list").innerHTML = items.map((item) => `
      <article class="list-item"><strong>${item.name}</strong><p>${item.status} · ${item.document}</p><code>${item.id}</code>
        <div class="actions">${["VERIFIED", "SUSPENDED", "REJECTED", "PENDING"].map((next) => `<button data-institution-id="${item.id}" data-institution-status="${next}">${next}</button>`).join("")}</div>
      </article>`).join("") || "<p>Nenhuma instituição.</p>";
  } catch { /* exibido no console */ }
}
$("#load-admin-institutions").addEventListener("click", loadAdminInstitutions);
$("#admin-status-filter").addEventListener("change", loadAdminInstitutions);
$("#admin-institutions-list").addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-institution-id]");
  if (!button) return;
  try {
    await request(`/institutions/admin/${button.dataset.institutionId}/status`, {
      method: "PATCH", body: JSON.stringify({ status: button.dataset.institutionStatus }),
    });
    await loadAdminInstitutions();
  } catch { /* exibido no console */ }
});

refreshSession();

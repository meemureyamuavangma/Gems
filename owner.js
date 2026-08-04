(() => {
  "use strict";

  const config = window.APP_CONFIG || {};

  const views = {
    configuration: document.querySelector("#configuration-view"),
    login: document.querySelector("#login-view"),
    unauthorized: document.querySelector("#unauthorized-view"),
    dashboard: document.querySelector("#dashboard-view")
  };

  const loginForm = document.querySelector("#login-form");
  const loginEmail = document.querySelector("#login-email");
  const loginPassword = document.querySelector("#login-password");
  const loginButton = document.querySelector("#login-button");
  const loginMessage = document.querySelector("#login-message");

  const logoutButton = document.querySelector("#logout-button");
  const unauthorizedLogout = document.querySelector("#unauthorized-logout");
  const ownerEmail = document.querySelector("#owner-email");

  const itemForm = document.querySelector("#item-form");
  const formTitle = document.querySelector("#form-title");
  const formMessage = document.querySelector("#form-message");
  const saveButton = document.querySelector("#save-button");
  const cancelEdit = document.querySelector("#cancel-edit");
  const ownerItems = document.querySelector("#owner-items");
  const ownerLoading = document.querySelector("#owner-loading");
  const itemCount = document.querySelector("#item-count");
  const imagePreview = document.querySelector("#image-preview img");

  const fields = {
    id: document.querySelector("#item-id"),
    name: document.querySelector("#item-name"),
    category: document.querySelector("#item-category"),
    price: document.querySelector("#item-price"),
    description: document.querySelector("#item-description"),
    imageUrl: document.querySelector("#item-image"),
    sortOrder: document.querySelector("#item-order"),
    published: document.querySelector("#item-published"),
    featured: document.querySelector("#item-featured")
  };

  let client = null;
  let items = [];

  function isConfigured() {
    return (
      typeof config.SUPABASE_URL === "string" &&
      config.SUPABASE_URL.startsWith("https://") &&
      !config.SUPABASE_URL.includes("YOUR-PROJECT") &&
      typeof config.SUPABASE_PUBLISHABLE_KEY === "string" &&
      config.SUPABASE_PUBLISHABLE_KEY.length > 20 &&
      !config.SUPABASE_PUBLISHABLE_KEY.includes("YOUR_SUPABASE")
    );
  }

  function showView(name) {
    Object.entries(views).forEach(([key, element]) => {
      element.hidden = key !== name;
    });
  }

  function setBusy(button, busy, busyText, normalText) {
    button.disabled = busy;
    button.textContent = busy ? busyText : normalText;
  }

  function safeImageUrl(value) {
    if (!value) return config.PLACEHOLDER_IMAGE || "./assets/placeholder.svg";

    try {
      const url = new URL(value, window.location.href);
      if (["http:", "https:"].includes(url.protocol)) return url.href;
    } catch (_) {
      // Fall through.
    }

    return config.PLACEHOLDER_IMAGE || "./assets/placeholder.svg";
  }

  function formatPrice(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "";

    return new Intl.NumberFormat(config.LOCALE || "en-LK", {
      style: "currency",
      currency: config.CURRENCY || "LKR",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2
    }).format(amount);
  }

  async function isAdmin() {
    const { data, error } = await client.rpc("is_admin");
    if (error) throw error;
    return data === true;
  }

  async function routeSession(session) {
    if (!session?.user) {
      showView("login");
      return;
    }

    try {
      if (!(await isAdmin())) {
        showView("unauthorized");
        return;
      }

      ownerEmail.textContent = `Signed in as ${session.user.email || "owner"}.`;
      showView("dashboard");
      await loadItems();
    } catch (error) {
      showView("unauthorized");
      console.error(error);
    }
  }

  async function loadItems() {
    ownerLoading.hidden = false;
    ownerItems.replaceChildren();

    const { data, error } = await client
      .from("items")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    ownerLoading.hidden = true;

    if (error) {
      renderPanelError(error.message);
      return;
    }

    items = Array.isArray(data) ? data : [];
    itemCount.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;
    renderItems();
  }

  function renderPanelError(message) {
    const box = document.createElement("div");
    box.className = "setup-message error-message";
    box.textContent = message;
    ownerItems.replaceChildren(box);
  }

  function makeStatus(text, isLive = false) {
    const status = document.createElement("span");
    status.className = isLive ? "status status-live" : "status";
    status.textContent = text;
    return status;
  }

  function createOwnerRow(item) {
    const row = document.createElement("article");
    row.className = "owner-item";

    const image = document.createElement("img");
    image.src = safeImageUrl(item.image_url);
    image.alt = "";
    image.loading = "lazy";
    image.addEventListener("error", () => {
      image.src = config.PLACEHOLDER_IMAGE || "./assets/placeholder.svg";
    });

    const info = document.createElement("div");
    info.className = "owner-item-info";

    const title = document.createElement("h3");
    title.textContent = item.name || "Untitled item";

    const meta = document.createElement("p");
    meta.textContent = `${item.category || "Uncategorized"} · ${formatPrice(item.price)}`;

    const statuses = document.createElement("div");
    statuses.className = "status-row";
    statuses.append(
      makeStatus(item.published ? "Published" : "Draft", item.published),
      makeStatus(`Order ${Number(item.sort_order || 0)}`)
    );
    if (item.featured) statuses.append(makeStatus("Featured"));

    info.append(title, meta, statuses);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "icon-button";
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", `Edit ${item.name || "item"}`);
    editButton.addEventListener("click", () => startEdit(item.id));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "icon-button icon-button-danger";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${item.name || "item"}`);
    deleteButton.addEventListener("click", () => deleteItem(item.id));

    actions.append(editButton, deleteButton);
    row.append(image, info, actions);
    return row;
  }

  function renderItems() {
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state owner-empty";
      const heading = document.createElement("h3");
      heading.textContent = "No items yet.";
      const text = document.createElement("p");
      text.textContent = "Create your first item using the editor.";
      empty.append(heading, text);
      ownerItems.replaceChildren(empty);
      return;
    }

    ownerItems.replaceChildren(...items.map(createOwnerRow));
  }

  function formPayload() {
    const name = fields.name.value.trim();
    if (!name) throw new Error("Item name is required.");

    const price = Number(fields.price.value);
    const order = Number(fields.sortOrder.value);

    return {
      name,
      category: fields.category.value.trim(),
      description: fields.description.value.trim(),
      price: Number.isFinite(price) && price >= 0 ? price : 0,
      image_url: fields.imageUrl.value.trim(),
      sort_order: Number.isFinite(order) ? Math.trunc(order) : 0,
      published: fields.published.checked,
      featured: fields.featured.checked
    };
  }

  async function saveItem(event) {
    event.preventDefault();
    formMessage.textContent = "";

    let payload;
    try {
      payload = formPayload();
    } catch (error) {
      formMessage.textContent = error.message;
      return;
    }

    setBusy(saveButton, true, "Saving…", "Save item");

    try {
      const id = fields.id.value;
      const query = id
        ? client.from("items").update(payload).eq("id", id)
        : client.from("items").insert(payload);

      const { error } = await query;
      if (error) throw error;

      resetForm();
      await loadItems();
    } catch (error) {
      formMessage.textContent = error.message || "Could not save the item.";
    } finally {
      setBusy(saveButton, false, "Saving…", "Save item");
    }
  }

  function startEdit(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    fields.id.value = item.id;
    fields.name.value = item.name || "";
    fields.category.value = item.category || "";
    fields.price.value = item.price ?? 0;
    fields.description.value = item.description || "";
    fields.imageUrl.value = item.image_url || "";
    fields.sortOrder.value = item.sort_order ?? 0;
    fields.published.checked = Boolean(item.published);
    fields.featured.checked = Boolean(item.featured);

    imagePreview.src = safeImageUrl(item.image_url);
    formTitle.textContent = "Edit item";
    cancelEdit.hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
    fields.name.focus({ preventScroll: true });
  }

  function resetForm() {
    itemForm.reset();
    fields.id.value = "";
    fields.price.value = "0";
    fields.sortOrder.value = "0";
    imagePreview.src = config.PLACEHOLDER_IMAGE || "./assets/placeholder.svg";
    formTitle.textContent = "Add new item";
    cancelEdit.hidden = true;
    formMessage.textContent = "";
  }

  async function deleteItem(id) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;

    const confirmed = window.confirm(
      `Delete "${item.name}" permanently? This action cannot be undone.`
    );
    if (!confirmed) return;

    const { error } = await client.from("items").delete().eq("id", id);

    if (error) {
      window.alert(error.message);
      return;
    }

    if (fields.id.value === id) resetForm();
    await loadItems();
  }

  async function signOut() {
    if (client) await client.auth.signOut();
    resetForm();
    showView("login");
  }

  async function initialize() {
    if (!isConfigured() || !window.supabase) {
      showView("configuration");
      return;
    }

    client = window.supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_PUBLISHABLE_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      loginMessage.textContent = "";
      setBusy(loginButton, true, "Signing in…", "Sign in");

      const { data, error } = await client.auth.signInWithPassword({
        email: loginEmail.value.trim(),
        password: loginPassword.value
      });

      setBusy(loginButton, false, "Signing in…", "Sign in");

      if (error) {
        loginMessage.textContent = error.message;
        return;
      }

      loginPassword.value = "";
      await routeSession(data.session);
    });

    itemForm.addEventListener("submit", saveItem);
    cancelEdit.addEventListener("click", resetForm);
    logoutButton.addEventListener("click", signOut);
    unauthorizedLogout.addEventListener("click", signOut);

    fields.imageUrl.addEventListener("input", () => {
      imagePreview.src = safeImageUrl(fields.imageUrl.value.trim());
    });

    imagePreview.addEventListener("error", () => {
      imagePreview.src = config.PLACEHOLDER_IMAGE || "./assets/placeholder.svg";
    });

    const { data, error } = await client.auth.getSession();
    if (error) {
      loginMessage.textContent = error.message;
      showView("login");
      return;
    }

    await routeSession(data.session);

    client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        showView("login");
      } else if (event === "SIGNED_IN" && session) {
        window.setTimeout(() => routeSession(session), 0);
      }
    });
  }

  initialize().catch((error) => {
    console.error(error);
    loginMessage.textContent = error.message || "Unexpected setup error.";
    showView("login");
  });
})();

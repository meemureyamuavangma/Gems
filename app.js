(() => {
  "use strict";

  const config = window.APP_CONFIG || {};
  const grid = document.querySelector("#item-grid");
  const loadingState = document.querySelector("#loading-state");
  const emptyState = document.querySelector("#empty-state");
  const setupMessage = document.querySelector("#setup-message");
  const hero = document.querySelector(".hero");
  const heroTitle = document.querySelector("#hero-title");
  const heroDescription = document.querySelector("#hero-description");
  const year = document.querySelector("#current-year");

  year.textContent = new Date().getFullYear();

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

  function formatPrice(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "";

    return new Intl.NumberFormat(config.LOCALE || "en-LK", {
      style: "currency",
      currency: config.CURRENCY || "LKR",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2
    }).format(amount);
  }

  function safeImageUrl(value) {
    if (!value) return config.PLACEHOLDER_IMAGE || "./assets/placeholder.svg";

    try {
      const url = new URL(value, window.location.href);
      if (["http:", "https:"].includes(url.protocol)) return url.href;
    } catch (_) {
      // Use the local placeholder below.
    }

    return config.PLACEHOLDER_IMAGE || "./assets/placeholder.svg";
  }

  function createItemCard(item) {
    const card = document.createElement("article");
    card.className = item.featured ? "item-card item-card-featured" : "item-card";

    const image = document.createElement("img");
    image.className = "item-card-image";
    image.src = safeImageUrl(item.image_url);
    image.alt = item.name || "Catalog item";
    image.loading = "lazy";
    image.addEventListener("error", () => {
      image.src = config.PLACEHOLDER_IMAGE || "./assets/placeholder.svg";
    });

    const overlay = document.createElement("div");
    overlay.className = "item-card-overlay";

    const content = document.createElement("div");
    content.className = "item-card-content";

    const category = document.createElement("span");
    category.className = "item-category";
    category.textContent = item.category || "Collection";

    const title = document.createElement("h3");
    title.textContent = item.name || "Untitled item";

    const description = document.createElement("p");
    description.textContent = item.description || "";

    const price = document.createElement("span");
    price.className = "item-price";
    price.textContent = formatPrice(item.price);

    content.append(category, title);
    if (item.description) content.append(description);
    content.append(price);

    card.append(image, overlay, content);
    return card;
  }

  function applyFeaturedHero(items) {
    const featured = items.find((item) => item.featured && item.image_url);
    if (!featured) return;

    hero.style.setProperty("--hero-image", `url("${safeImageUrl(featured.image_url)}")`);
    hero.classList.add("hero-has-image");
    heroTitle.textContent = featured.name || "Designed to feel effortless.";
    heroDescription.textContent =
      featured.description ||
      "Discover a carefully selected collection created for a premium experience.";
  }

  async function loadItems() {
    if (!isConfigured() || !window.supabase) {
      loadingState.hidden = true;
      setupMessage.hidden = false;
      return;
    }

    const client = window.supabase.createClient(
      config.SUPABASE_URL,
      config.SUPABASE_PUBLISHABLE_KEY
    );

    const { data, error } = await client
      .from("items")
      .select("id,name,category,description,price,image_url,featured,sort_order")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    loadingState.hidden = true;

    if (error) {
      const errorBox = document.createElement("div");
      errorBox.className = "setup-message error-message";

      const strong = document.createElement("strong");
      strong.textContent = "Could not load items.";

      const detail = document.createElement("span");
      detail.textContent = error.message;

      errorBox.append(strong, detail);
      grid.replaceChildren(errorBox);
      return;
    }

    const items = Array.isArray(data) ? data : [];

    if (items.length === 0) {
      emptyState.hidden = false;
      return;
    }

    applyFeaturedHero(items);
    grid.replaceChildren(...items.map(createItemCard));
  }

  loadItems().catch((error) => {
    loadingState.hidden = true;
    const message = document.createElement("div");
    message.className = "setup-message error-message";
    message.textContent = error instanceof Error ? error.message : "Unexpected loading error.";
    grid.replaceChildren(message);
  });
})();

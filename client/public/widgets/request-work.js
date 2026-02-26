(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function createForm() {
    const form = document.createElement("form");
    form.style.border = "1px solid #d1d5db";
    form.style.borderRadius = "12px";
    form.style.padding = "16px";
    form.style.maxWidth = "420px";
    form.style.fontFamily = "Inter, system-ui, -apple-system, sans-serif";
    form.innerHTML = `
      <h3 style="margin:0 0 8px;font-size:18px;color:#0f172a">Request Work</h3>
      <p style="margin:0 0 12px;color:#475569;font-size:13px">We’ll confirm details and schedule you.</p>
      <label style="display:block;margin-bottom:8px;font-size:13px;color:#334155">
        Name
        <input name="name" required style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;margin-top:4px"/>
      </label>
      <label style="display:block;margin-bottom:8px;font-size:13px;color:#334155">
        Email
        <input name="email" type="email" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;margin-top:4px"/>
      </label>
      <label style="display:block;margin-bottom:8px;font-size:13px;color:#334155">
        Phone
        <input name="phone" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;margin-top:4px"/>
      </label>
      <label style="display:block;margin-bottom:8px;font-size:13px;color:#334155">
        Address
        <input name="address" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;margin-top:4px"/>
      </label>
      <label style="display:block;margin-bottom:8px;font-size:13px;color:#334155">
        Services (comma separated)
        <input name="services" placeholder="House wash, windows" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;margin-top:4px"/>
      </label>
      <label style="display:block;margin-bottom:12px;font-size:13px;color:#334155">
        Notes
        <textarea name="message" rows="3" style="width:100%;padding:8px;border:1px solid #cbd5e1;border-radius:8px;margin-top:4px"></textarea>
      </label>
      <button type="submit" style="width:100%;background:#0ea5e9;color:white;border:none;border-radius:8px;padding:10px;font-weight:600;cursor:pointer">
        Send request
      </button>
      <p data-widget-status style="display:none;margin-top:8px;font-size:13px;"></p>
    `;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const statusEl = form.querySelector("[data-widget-status]");
      statusEl.style.display = "block";
      statusEl.style.color = "#334155";
      statusEl.textContent = "Sending…";

      const services = data.services
        ? String(data.services)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      const payload = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        services,
        message: data.message || undefined,
        companyId: window.QuoteIQCompanyId || 1,
      };

      try {
        const resp = await fetch("/api/trpc/publicSite.contact.requestWorkWidget", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: payload }),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (json?.error) throw new Error(json.error.message || "Unknown error");
        statusEl.style.color = "#16a34a";
        statusEl.textContent = "Request received! We’ll reach out soon.";
        form.reset();
      } catch (err) {
        statusEl.style.color = "#dc2626";
        statusEl.textContent = "Failed to send request. Please try again.";
        console.error("[QuoteIQ Widget]", err);
      }
    });

    return form;
  }

  ready(() => {
    const container = document.querySelector('[data-quoteiq-widget="request-work"]');
    if (!container) return;
    container.appendChild(createForm());
  });
})();

document.addEventListener("DOMContentLoaded", () => {
  const categorySelect = document.getElementById("elig-cat");
  const itemSelect = document.getElementById("elig-item");
  const form = document.getElementById("eligibility-form");
  const resultsDiv = document.getElementById("eligible-results");

  function updateItems() {
    const selected = categorySelect.value;
    itemSelect.innerHTML = "";
    document.querySelectorAll("h3").forEach(h3 => {
      if (h3.textContent.includes(selected)) {
        const list = h3.nextElementSibling?.nextElementSibling;
        if (list) {
          list.querySelectorAll("li").forEach(li => {
            const item = li.textContent.trim();
            const opt = document.createElement("option");
            opt.value = item.replace("❌", "").trim();
            opt.textContent = opt.value;
            itemSelect.appendChild(opt);
          });
        }
      }
    });
  }

  categorySelect?.addEventListener("change", updateItems);
  updateItems();

  form?.addEventListener("submit", e => {
    e.preventDefault();
    fetch("/check-eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: categorySelect.value,
        item: itemSelect.value
      })
    })
      .then(res => res.json())
      .then(data => {
        resultsDiv.innerHTML = `<h3>Eligible Members:</h3><ul>` +
          data.eligible.map(m => `<li>${m.name}</li>`).join("") +
          `</ul>`;
      });
  });
});

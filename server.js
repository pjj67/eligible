const express = require("express");
const app = express();
const path = require("path");
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");

const file = path.join(__dirname, "db.json");
const adapter = new JSONFile(file);
const db = new Low(adapter);

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", async (req, res) => {
  await db.read();
  const { members = [], categories = {} } = db.data;
  res.render("index", { members, categories });
});

// --- Member Routes ---
app.post("/add-member", async (req, res) => {
  const { name } = req.body;
  await db.read();
  db.data.members.push({
    name,
    attendance: Array(8).fill(false),
    items: {}
  });
  db.data.members.sort((a, b) => a.name.localeCompare(b.name));
  await db.write();
  res.redirect("/");
});

app.post("/remove-member", async (req, res) => {
  const { name } = req.body;
  await db.read();
  db.data.members = db.data.members.filter(m => m.name !== name);
  await db.write();
  res.redirect("/");
});

app.post("/update-attendance", async (req, res) => {
  await db.read();
  const updates = req.body;
  db.data.members.forEach(member => {
    if (updates[member.name]) {
      member.attendance = updates[member.name].map(a => a === "true");
    }
  });
  await db.write();
  res.redirect("/");
});

// --- Categories ---
app.post("/add-category", async (req, res) => {
  const { category } = req.body;
  await db.read();
  db.data.categories[category] = db.data.categories[category] || [];
  await db.write();
  res.redirect("/");
});

app.post("/remove-category", async (req, res) => {
  const { category } = req.body;
  await db.read();
  delete db.data.categories[category];
  db.data.members.forEach(m => delete m.items[category]);
  await db.write();
  res.redirect("/");
});

// --- Items ---
app.post("/add-item", async (req, res) => {
  const { category, item } = req.body;
  await db.read();
  db.data.categories[category] = db.data.categories[category] || [];
  if (!db.data.categories[category].includes(item)) {
    db.data.categories[category].push(item);
  }
  await db.write();
  res.redirect("/");
});

app.post("/remove-item", async (req, res) => {
  const { category, item } = req.body;
  await db.read();
  db.data.categories[category] = db.data.categories[category].filter(i => i !== item);
  db.data.members.forEach(m => {
    m.items[category] = (m.items[category] || []).filter(i => i !== item);
  });
  await db.write();
  res.redirect("/");
});

// --- Assignments ---
app.post("/assign-item", async (req, res) => {
  const { member, category, item } = req.body;
  await db.read();
  const m = db.data.members.find(m => m.name === member);
  if (!m.items[category]) m.items[category] = [];
  if (!m.items[category].includes(item)) m.items[category].push(item);
  await db.write();
  res.redirect("/");
});

app.post("/unassign-item", async (req, res) => {
  const { member, category, item } = req.body;
  await db.read();
  const m = db.data.members.find(m => m.name === member);
  if (m.items[category]) {
    m.items[category] = m.items[category].filter(i => i !== item);
  }
  await db.write();
  res.redirect("/");
});

// --- Eligibility Check ---
app.post("/check-eligibility", async (req, res) => {
  const { category, item } = req.body;
  await db.read();
  const eligible = db.data.members.filter(m => {
    const attended = m.attendance.filter(e => e).length;
    const hasItem = m.items[category] && m.items[category].includes(item);
    return attended >= 4 && hasItem;
  });
  res.json({ eligible });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("App running on port", PORT));

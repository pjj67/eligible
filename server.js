const express = require("express");
const app = express();
const path = require("path");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const file = path.join(__dirname, "db.json");
const adapter = new FileSync(file);
const db = low(adapter);

// Ensure default structure
db.defaults({ members: [], categories: {} }).write();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  const { members = [], categories = {} } = db.getState();

  const sortedMembers = members.sort((a, b) => a.name.localeCompare(b.name));

  res.render("index", {
    members: sortedMembers,
    categories,
    selectedCategory: "", // 👈 Fix: Add this line
    selectedItem: "",      // (optional) if you're also using `selectedItem`
    eligibleMembers: []    // (optional) for eligibility list output
  });
});

// --- Member Routes ---
app.post("/add-member", (req, res) => {
  const { name } = req.body;
  db.get("members")
    .push({
      name,
      attendance: Array(8).fill(false),
      items: {}
    })
    .write();
  res.redirect("/");
});

app.post("/remove-member", (req, res) => {
  const { name } = req.body;
  db.get("members").remove({ name }).write();
  res.redirect("/");
});

// --- Categories ---
app.post("/add-category", (req, res) => {
  const { category } = req.body;
  const categories = db.get("categories").value();
  if (!categories[category]) {
    db.get("categories").set(category, []).write();
  }
  res.redirect("/");
});

app.post("/remove-category", (req, res) => {
  const { category } = req.body;
  db.get("categories").unset(category).write();
  db.get("members").forEach(m => {
    delete m.items[category];
  }).write();
  res.redirect("/");
});

// --- Items ---
app.post("/add-item", (req, res) => {
  const { category, item } = req.body;
  const items = db.get("categories").get(category).value();
  if (!items.includes(item)) {
    db.get("categories").get(category).push(item).write();
  }
  res.redirect("/");
});

app.post("/remove-item", (req, res) => {
  const { category, item } = req.body;
  db.get("categories").get(category).remove(i => i === item).write();
  db.get("members").forEach(m => {
    if (m.items[category]) {
      m.items[category] = m.items[category].filter(i => i !== item);
    }
  }).write();
  res.redirect("/");
});

// --- Need List ---
app.post("/assign-need", (req, res) => {
  const { member, category, item } = req.body;
  const memberRef = db.get("members").find({ name: member });

  const m = memberRef.value();
  if (!m.items[category]) {
    m.items[category] = [];
  }
  if (!m.items[category].includes(item)) {
    m.items[category].push(item);
  }

  memberRef.assign({ items: m.items }).write();
  res.redirect("/");
});

app.post("/revoke-need", (req, res) => {
  const { member, category, item } = req.body;
  const memberRef = db.get("members").find({ name: member });

  const m = memberRef.value();
  if (m.items[category]) {
    m.items[category] = m.items[category].filter(i => i !== item);
  }

  memberRef.assign({ items: m.items }).write();
  res.redirect("/");
});

// --- Attendance ---
app.post("/update-attendance", (req, res) => {
  const attendanceUpdates = req.body.attendance || {};
  const allMembers = db.get("members").value();

  const updatedMembers = allMembers.map(member => {
    const name = member.name;
    const rawAttendance = attendanceUpdates[name] || [];

    // Ensure all 8 entries are accounted for, defaulting to false
    const newAttendance = Array(8).fill(false).map((_, i) => {
      const val = rawAttendance[i];
      return val === "true" || val === true || val === "on";
    });

    return {
      ...member,
      attendance: newAttendance
    };
  });

  db.set("members", updatedMembers).write();
  res.redirect("/");
});

app.post("/check-eligibility", (req, res) => {
  const { category, item } = req.body;

  const { members = [], categories = {} } = db.getState();

  const eligibleMembers = members.filter(member => {
    const attendanceCount = member.attendance.filter(a => a).length;

    // Check all categories for the item, not just the selected one
    const hasItem = Object.values(member.items || {}).some(itemList =>
      itemList.includes(item)
    );

    return attendanceCount >= 4 && hasItem;
  });

  const sortedMembers = members.sort((a, b) => a.name.localeCompare(b.name));

  res.render("index", {
    members: sortedMembers,
    categories,
    selectedCategory: category,
    selectedItem: item,
    eligibleMembers
  });
});



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("App running on port", PORT));

const express = require("express");
const app = express();
const path = require("path");
const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const file = path.join(__dirname, "db.json");
const adapter = new FileSync(file);
const db = low(adapter);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  const { members = [], categories = {} } = db.getState();

  // Sort members alphabetically by name
  const sortedMembers = members.sort((a, b) => a.name.localeCompare(b.name));

  res.render("index", { members: sortedMembers, categories });
});

// --- Member Routes ---
app.post("/add-member", (req, res) => {
  const { name } = req.body;
  db.get("members")
    .push({
      name,
      attendance: Array(8).fill(false), // Set initial attendance to false for all events (8 events)
      items: {} // This will track the items each member has
    })
    .sortBy("name")
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
    m.items[category] = undefined;
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
    m.items[category] = m.items[category] ? m.items[category].filter(i => i !== item) : [];
  }).write();
  res.redirect("/");
});

// --- Need List Assignment and Revocation ---
app.post("/assign-need", (req, res) => {
  const { member, category, item } = req.body;
  const m = db.get("members").find({ name: member }).value();

  // Ensure the items property exists
  if (!m.items[category]) {
    m.items[category] = [];
  }

  // Assign the item if not already assigned
  if (!m.items[category].includes(item)) {
    m.items[category].push(item);
  }
  
  db.write();
  res.redirect("/");
});

app.post("/revoke-need", (req, res) => {
  const { member, category, item } = req.body;
  const m = db.get("members").find({ name: member }).value();

  // If the member has the item, remove it
  if (m.items[category]) {
    m.items[category] = m.items[category].filter(i => i !== item);
  }

  db.write();
  res.redirect("/");
});

app.post("/update-attendance", (req, res) => {
  console.log("Attendance submission:", JSON.stringify(req.body, null, 2));

  const updates = req.body.attendance || {};

  const members = db.get("members").value();

  const updatedMembers = members.map(member => {
    const name = member.name;
    const attendanceData = updates[name] || {};

    const newAttendance = [];

    for (let i = 0; i < 8; i++) {
      // Set to 'true' or 'false' based on the data sent by the form
      const val = attendanceData[i] === "true"; // Ensure we correctly interpret 'true' and 'false'
      newAttendance[i] = val;
    }

    return {
      ...member,
      attendance: newAttendance
    };
  });

  db.set("members", updatedMembers).write();
  res.redirect("/");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("App running on port", PORT));

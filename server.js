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

/// --- Attendance Update Route ---
app.post("/update-attendance", (req, res) => {
  const updates = req.body; // This will have member names as keys

  // Loop through all members and update their attendance based on the submitted data
  db.get("members").forEach(member => {
    if (updates[member.name]) {
      // Map through the events to update attendance based on submitted data
      const updatedAttendance = member.attendance.map((att, index) => {
        // Check if the event is marked as "true" or "false" in the form data
        return updates[member.name][index] === "true"; 
      });

      // Update the member's attendance
      member.attendance = updatedAttendance;
    }
  }).write();

  // Redirect back to the homepage after updating
  res.redirect("/");
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("App running on port", PORT));

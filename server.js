const express = require("express");
const app = express();
const path = require("path");
const fetch = require("node-fetch"); // Import fetch for HTTP requests

const url = "https://cdn.glitch.com/expovoi/db.json"; // Glitch asset URL for db.json

// Helper function to fetch and parse the db.json data
async function fetchDB() {
  try {
    const response = await fetch(url); // Fetch the file from the URL
    const data = await response.json(); // Parse the JSON data
    return data; // Return the data to use in the routes
  } catch (error) {
    console.error("Error fetching db.json:", error); // Handle any errors
    return { members: [], categories: {} }; // Return default structure on error
  }
}

// --- Ensure Default Structure ---
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", async (req, res) => {
  const { members = [], categories = {} } = await fetchDB();

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
app.post("/add-member", async (req, res) => {
  const { name } = req.body;
  const db = await fetchDB(); // Fetch the current data
  db.members.push({
    name,
    attendance: Array(8).fill(false),
    items: {}
  });
  // You need a way to update the db.json after modifying it. For this, you'd likely need to POST back the changes to the URL or store it elsewhere.
  res.redirect("/");
});

app.post("/remove-member", async (req, res) => {
  const { name } = req.body;
  const db = await fetchDB();
  const updatedMembers = db.members.filter(member => member.name !== name);
  db.members = updatedMembers;
  res.redirect("/");
});

// --- Categories ---
app.post("/add-category", async (req, res) => {
  const { category } = req.body;
  const db = await fetchDB();
  const categories = db.categories || {};
  if (!categories[category]) {
    db.categories[category] = [];
  }
  res.redirect("/");
});

app.post("/remove-category", async (req, res) => {
  const { category } = req.body;
  const db = await fetchDB();
  delete db.categories[category];
  db.members.forEach(m => {
    delete m.items[category];
  });
  res.redirect("/");
});

// --- Items ---
app.post("/add-item", async (req, res) => {
  const { category, item } = req.body;
  const db = await fetchDB();
  const items = db.categories[category] || [];
  if (!items.includes(item)) {
    db.categories[category].push(item);
  }
  res.redirect("/");
});

app.post("/remove-item", async (req, res) => {
  const { category, item } = req.body;
  const db = await fetchDB();
  const categoryItems = db.categories[category] || [];
  db.categories[category] = categoryItems.filter(i => i !== item);
  db.members.forEach(m => {
    if (m.items[category]) {
      m.items[category] = m.items[category].filter(i => i !== item);
    }
  });
  res.redirect("/");
});

// --- Attendance ---
app.post("/update-attendance", async (req, res) => {
  const attendanceUpdates = req.body.attendance || {};
  const db = await fetchDB();
  db.members.forEach(member => {
    const name = member.name;
    const rawAttendance = attendanceUpdates[name] || [];
    member.attendance = Array(8).fill(false).map((_, i) => {
      const val = rawAttendance[i];
      return val === "true" || val === true || val === "on";
    });
  });
  res.redirect("/");
});

// --- Eligibility ---
app.post("/check-eligibility", async (req, res) => {
  const { category, item } = req.body;
  const db = await fetchDB();
  const eligibleMembers = db.members.filter(member => {
    const attendanceCount = member.attendance.filter(a => a).length;
    const hasItem = Object.values(member.items || {}).some(itemList =>
      itemList.includes(item)
    );
    return attendanceCount >= 4 && hasItem;
  });

  res.render("index", {
    members: db.members.sort((a, b) => a.name.localeCompare(b.name)),
    categories: db.categories,
    selectedCategory: category,
    selectedItem: item,
    eligibleMembers
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("App running on port", PORT));

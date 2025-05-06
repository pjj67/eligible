const express = require("express");
const app = express();
const path = require("path");
const fetch = require("node-fetch"); // Required if using Node < 18

const SOURCE_URL = "https://expovoi.glitch.me/db.json"; // 🔁 Replace with your real project URL

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Homepage - show all members and categories
app.get("/", async (req, res) => {
  try {
    const response = await fetch(SOURCE_URL);
    const data = await response.json();

    const members = (data.members || []).sort((a, b) => a.name.localeCompare(b.name));
    const categories = data.categories || {};
    const eventDatesRaw = data.eventDates || [];

    // Format eventDates to dd/mm/yyyy
    const eventDates = eventDatesRaw.map(dateStr => {
      if (!dateStr) return null;
      const date = new Date(dateStr);
      if (isNaN(date)) return null;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    });

    res.render("index", {
      members,
      categories,
      eventDates,
      selectedCategory: "",
      selectedItem: "",
      eligibleMembers: []
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).send("Failed to load external data.");
  }
});


// Eligibility checker (read-only logic)
app.post("/check-eligibility", async (req, res) => {
  const { category, item } = req.body;

  try {
    const response = await fetch(SOURCE_URL);
    const data = await response.json();

    const members = data.members || [];
    const categories = data.categories || {};

    const eligibleMembers = members.filter(member => {
      const attendanceCount = member.attendance.filter(a => a).length;
      const hasItem = member.items[category] && member.items[category].includes(item);
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
  } catch (err) {
    console.error("Error checking eligibility:", err);
    res.status(500).send("Failed to load external data.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Read-only viewer running on port", PORT));

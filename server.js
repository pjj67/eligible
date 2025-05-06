const express = require("express");
const app = express();
const path = require("path");
const fetch = require("node-fetch"); // Only needed for Node < 18

const SOURCE_URL = "https://expovoi.glitch.me/db.json"; // ✅ Replace with your actual Glitch project URL

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Helper to convert ISO date to dd/mm/yyyy
const formatDate = (isoDate) => {
  const date = new Date(isoDate);
  if (isNaN(date)) return ""; // Return empty string if invalid
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Homepage - show all members and categories
app.get("/", async (req, res) => {
  try {
    const response = await fetch(SOURCE_URL);
    const data = await response.json();

    const members = (data.members || []).sort((a, b) => a.name.localeCompare(b.name));
    const categories = data.categories || {};
    const rawEventDates = data.eventDates || [];

    // Map eventDates to the proper format (dd/mm/yyyy)
    const eventDates = rawEventDates.map(formatDate);

    res.render("index", {
      members,
      categories,
      eventDates, // Ensure eventDates is passed correctly
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
    const categories = data.categories || [];
    const rawEventDates = data.eventDates || [];

    // Map eventDates to the proper format (dd/mm/yyyy)
    const eventDates = rawEventDates.map(formatDate);

    // Filter members who are eligible
    const eligibleMembers = members.filter(member => {
      const attendanceCount = member.attendance.filter(a => a).length;
      const hasItem = member.items[category] && member.items[category].includes(item);
      return attendanceCount >= 4 && hasItem;
    });

    // Sort members alphabetically by name
    const sortedMembers = members.sort((a, b) => a.name.localeCompare(b.name));

    res.render("index", {
      members: sortedMembers,
      categories,
      eventDates, // Ensure eventDates is passed correctly
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

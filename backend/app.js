const express = require("express");
const cors = require("cors");
require("dotenv").config();

const userRoutes = require("./routes/user");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/user", userRoutes);

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

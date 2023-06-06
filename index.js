

const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
// jwt = require('jsonwebtoken');


// middle wares 
const corsConfig = {
  origin: "*",
  credential: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
}
app.use(cors(corsConfig));

// app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Assignment 12 is running");
})

app.listen(port, ()=>{
    console.log("Assignment 12 is running on port: ",port)
})
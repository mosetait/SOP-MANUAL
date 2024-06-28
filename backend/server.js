const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const { StatusCodes } = require("http-status-codes");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");


const { errorHandler, ErrorResponse } = require("./middleware/errorMiddleware");

require("dotenv").config();

const port = process.env.PORT;
const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({extended: true}));
app.use(
  fileUpload({
      useTempFiles: true,
      tempFileDir: "/tmp",
  })
);

const db = process.env.MONGODB_URI;
mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// app.use(morgan("tiny"));

app.use(helmet());

app.use(cors());

app.use("/api", require("./routes/api"));

// Serve frontend
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(
      path.resolve(__dirname, "../", "frontend", "build", "index.html")
    )
  );
} else {
  app.get("/", (req, res) => res.send("Please set to production"));
}

app.use("*", (req, res, next) => {
  throw new ErrorResponse("Not found", StatusCodes.NOT_FOUND);
});

app.use(errorHandler);

app.listen(port, () => console.log(`Server started on port ${port}`));

module.exports = app;

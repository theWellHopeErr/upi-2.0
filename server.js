const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const dotEnv = require("dotenv");

dotEnv.config();
const PORT = process.env.PORT || 8080;
const app = express();
app.use(bodyParser.json());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

const dbConnect = require("./dbConnect");
dbConnect
  .connectDB()
  .then(() => {
    console.log("Connected successfully");
  })
  .catch((err) => {
    console.log("Connection error", err);
  });

app.get("/", (_req, res) => {
  dbConnect
    .getDB()
    .then(async (db) => {
      const users = await db
        .collection("user")
        .find({}, { projection: { password: 0, _id: 0 } })
        .toArray()
        .catch((err) => {
          res.status(500).send(err);
          return;
        });
      res.send(users);
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

app.use(require("./routes/auth.route"));

app.use((req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token === null)
    return res.status(401).send({ message: "No access token" });

  jwt.verify(token, process.env.SECRET_KEY, (err, payload) => {
    console.log(err);
    if (err) return res.status(403).send({ message: "Access token expired" });
    req.user = payload;
    next();
  });
})

app.use(require("./routes/account.route"));

app.listen(PORT, () => {
  console.log(`Listening at PORT: ${PORT}`);
})
const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const dbConnect = require("../dbConnect");

const authRoute = express();
authRoute.use(bodyParser.json());

const hash = (password, salt) => {
  var hashed = crypto.pbkdf2Sync(password, salt, 10000, 512, "sha512");
  return ["pdkdf2", "10000", salt, hashed.toString("hex")].join("$");
};

const accessTokenGenerator = (payload) => {
  return jwt.sign(payload, process.env.SECRET_KEY, {
    expiresIn: '3600s',
  });
};

//Endpoint for POST /register
//To register a new user
/**************************
 req.body Format
 {
   "name": String,
   "username": String,
   "password": String,
  }
***************************/
authRoute.post('/register', (req, res) => {
  const { name, username, password } = req.body
  if (!name || !username || !password)
    res.status(400).send({
      message: "Bad Request Body.",
    });

  dbConnect.getDB().then(async (db) => {
    const userCollection = db.collection("user")
    const accountId = Math.floor(Math.random() * 100000000)
    const users = await userCollection
      .find({ $or: [{ username }, { accountId }] })
      .toArray()
      .catch((err) => {
        throw new Error("Error while finding user");
      });
    // To avoid registration of same usernames
    if (users.length > 0) {
      res.status(400).send({
        message: `username ${username} already exists or account number exists try again`,
      });
      return;
    }
    const salt = crypto.randomBytes(128).toString("hex");
    const hashedPassword = hash(password, salt);

    await userCollection
      .insertOne({
        name,
        accountId,
        username,
        password: hashedPassword,
      })
      .catch((err) => {
        console.log({ url: req.url, err });
        res.status(500).send("Couldn't insert user");
        return;
      });
    res.status(201).send({ data: { name, accountId, username } });
  })
    .catch((err) => {
      console.log({ url: req.url, err });
      res.status(500).send("Couldn't connect DB");
    });
})

//Endpoint for POST /login
//To log in as an user
/**************************
  req.body Format
  {
    "username": String,
    "password": String,
  }
***************************/
authRoute.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!(username && password)) {
    res.status(400).send({
      message: "Bad Request Body.",
    });
  } else {
    dbConnect
      .getDB()
      .then(async (db) => {
        const userCollection = db.collection("user");

        const user = await userCollection.findOne({ username }).catch((err) => {
          console.log("Error in finding user", err);
          throw new Error("Error in finding user");
        });

        //Wrong Username
        if (!user) {
          res.status(401).send({
            message: `Invalid credentials`,
          });
          return;
        }

        const actualPassword = user.password;
        const salt = actualPassword.split("$")[2];
        const hashedPassword = hash(password, salt);

        //Wrong Password
        if (hashedPassword !== actualPassword) {
          res.status(401).send({
            message: `Invalid credentials`,
          });
          return;
        }
        const accessToken = accessTokenGenerator({
          username: req.body.username,
          accountId: user.accountId,
        });

        const data = {
          name: user.name,
          accountId: user.accountId,
          accessToken,
        }
        //Display message to upload CSV if the user doesn't have any transactions
        if (!user.transactions)
          data.message = 'You can update your transaction data by upload a csv file at POST /upload'

        res.status(200).send({ data });
      })
      .catch((err) => {
        console.log({ url: req.url, err });
        res.status(500).send("Error while connecting DB");
      });
  }
});

module.exports = authRoute;
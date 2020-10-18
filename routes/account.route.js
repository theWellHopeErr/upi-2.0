const express = require("express");
const bodyParser = require('body-parser');
const multer = require('multer');
const csv = require('fast-csv');
const fs = require('fs');
const dbConnect = require("../dbConnect");

const accountRoute = express();
accountRoute.use(bodyParser.json());

const getFileName = (originalName, accountId) => {
  const ext = originalName.substr(originalName.lastIndexOf('.') + 1)
  const d = new Date();
  const time = [d.getHours().toString().padStart(2, 0), d.getMinutes().toString().padStart(2, 0), d.getSeconds().toString().padStart(2, 0)].join('')
  const date = [d.getFullYear(), d.getMonth().toString().padStart(2, 0), d.getDate().toString().padStart(2, 0)].join('')
  return [accountId, date, time].join("_").concat(".", ext)
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = `./uploadedCSV`;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, getFileName(file.originalname, req.user.accountId))
  }
});

const uploadFileMiddleware = (req, res, next) => {
  const upload = multer({
    storage,
    fileFilter: (_req, file, cb) => {
      // Only CSV files
      var ext = file.originalname.substr(file.originalname.lastIndexOf('.') + 1);
      if (ext !== 'csv') {
        return cb(new Error('Only CSV files can be uploaded'));
      }
      cb(null, true)
    }
  }).single('csvfile');

  upload(req, res, err => {
    if (err) {
      console.log(err)
      return res.status(500).send({ error: err.message });
    }
    else next();
  });
}


//Endpoint for GET /account
//To View Account Details
accountRoute.get('/account', async (req, res) => {
  dbConnect.getDB().then(async (db) => {
    const userCollection = db.collection('user');
    const user = await userCollection.findOne({ username: req.user.username });
    const { username, name, accountId, transactions } = user;
    res.send({ username, name, accountId, transactions });
  }).catch((err) => {
    console.log({ url: req.url, err });
    res.status(500).send("Couldn't connect DB");
  });
});


//Endpoint for POST /upload
//To upload CSV to populate DB
/*******************************
  Upload a CSV file in Postman
********************************/
accountRoute.post('/upload', uploadFileMiddleware, async (req, res, next) => {
  let accountDetails = [];
  fs.createReadStream(`./uploadedCSV/${req.file.filename}`)
    .pipe(csv.parse({ headers: true }))
    .on('data', row => {
      if (row["Date"].length > 0) {
        const type = row["Withdraw"] ? 'debit' : 'credit',
          description = row["Description"],
          amount = type === 'debit' ? parseInt(row["Withdraw"]) : parseInt(row["Deposit"]),
          date = new Date(row["Date"]),
          balance = row["Closing Balance"]
        accountDetails.push({
          date,
          type,
          amount,
          description,
          balance,
        });
      }
    })
    .on('end', () => {
      req.accountDetails = accountDetails;
      next();
    });
}, async (req, res) => {
  const accountDetails = req.accountDetails;
  const { accountId, username } = req.user;

  dbConnect.getDB().then(async (db) => {
    const userCollection = db.collection('user');
    userCollection
      .updateOne(
        { accountId },
        { $set: { transactions: accountDetails } }
      )
      .then(() => {
        res.send({ username, accountId, transactions: accountDetails });
      })
      .catch(err => {
        console.log("Error while updating user transactions in DB", err);
        res.status(500).send("Error in uploading your transactions... Try Again!");
      });
  }).catch((err) => {
    console.log({ url: req.url, err });
    res.status(500).send("Couldn't connect DB");
  });
});

module.exports = accountRoute;

const MongoClient = require("mongodb").MongoClient;
let client = undefined;

const DB_URL = process.env.DB_URL
// Used DB from Atlas Cluster 
// connectionString = mongodb+srv://root:<password>@twhecluster.jasf7.mongodb.net/<dbname>?retryWrites=true&w=majority

const connectDB = () => {
  return new Promise(async (resolve, reject) => {
    client = new MongoClient(DB_URL, {
      useUnifiedTopology: true,
    });
    await client.connect().catch((err) => {
      console.log("Couldn't connect to database", err);
      reject("Couldn't connect to database");
    });
    const db = client.db("upi_2");
    resolve(db);
  });
};

const getDB = () => {
  if (client) {
    const db = client.db("upi_2");
    return new Promise((resolve, _reject) => {
      resolve(db);
    });
  } else {
    return connectDB();
  }
};

const closeDB = () => {
  if (client) {
    client.close();
    console.log("DB Connection closed");
  }
};

module.exports = { connectDB, getDB, closeDB };
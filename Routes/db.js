const express = require('express')
var pg = require('pg');
let app = express.Router()
let smarClient;
const smarSdk = require("smartsheet");

// Initialize client SDK
function initializeSmartsheetClient(token, logLevel) {
    smarClient = smarSdk.createClient({
        // If token is falsy, value will be read from SMARTSHEET_ACCESS_TOKEN environment variable
        accessToken: token,
        logLevel: logLevel
    });
}
const config = {
  user: 'bwrzkjxunkgmmf',
  database: 'd7ndg2j0guu48t',
  password: '27297b65bc871cd8fbb337898f4b1136d2622f2121d1a3c45a6328b116b3fd0a',
  port: 5432,
  connectionString: process.env.HEROKU_POSTGRESQL_NAVY_URL,
  ssl: { rejectUnauthorized: false }                 //Default port, change it if needed
};
var pool = new pg.Pool(config)

function updatePostgress(eventVal,arr1) {
 

}
//app.set('port', process.env.PORT || 8080);
app.get('/', function(req, res) {
  
  console.log(`arr1 in db:`, arr1);
  pool.connect(function (err, conn, done) {
      // watch for any connect issues
      if (err) console.log(err);
      var values = [
        [1, 0001, 'Open'], 
        [2, 0002, 'Closed']
      ];
      conn.query(
          //'INSERT INTO test_table (id, casenumber, status) VALUES %L', values,
          'INSERT INTO salesforce.case ("subject", "status") VALUES ($1,$2);', ['This is a test case', 'Open'],
          function(err, result) {
            console.log('Insertion result',result.rows.sfid)
              //res.json(result.rows);
              if (err != null || result.rowCount != 0) {
                conn.query('SELECT * FROM salesforce.case',
                function(err, result) {
                  done();
                  if (err) {

                      res.status(400).json({error: err.message});
                  }
                  else {
                      // this will still cause jquery to display 'Record updated!'
                      // eventhough it was inserted
                      //res.json(result.rows);
                      console.log('select result',result.rows)
                      //res.send(result);
                  }
                });
              }
              else {
                  done();
                  res.json(result);
              }
          }
      );
  });
});
(async () => {
  try {
      // TODO: Edit config.json to set desired sheet id and API token
      const config = require("./config.json");

      initializeSmartsheetClient(config.smartsheetAccessToken, config.logLevel);

      // Sanity check: make sure we can access the sheet
      await probeSheet(config.sheetId);
     
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () =>
          console.log("Node-webhook-sample app listening on port 3000"));

      await initializeHook(config.sheetId, config.webhookName, config.callbackUrl);
  } catch (err) {
      console.error(err);
  }
})();
module.exports = app
module.exports = { updatePostgress };
const express = require('express');
router = express.Router();
columns = require('./routes/columns');
const app = express();
var client = require('smartsheet');
const { Pool,Client } = require('pg');
const dbRoute = require('./Routes/db')
global.smartsheetRow ="";
app.get('/', (req, res) => {
 

var smartsheet = client.createClient({accessToken:'wqcp4Jr9wKsaUfajS0DIxkSrd3qMH3YitxSCE'});

var options = {
  sheetId: 4067414670370692, // Id of Sheet
  rowId: 3743601462798212
};

smartsheet.sheets.getRow(options)
  .then(function(row) {
    console.log(row);
    //
    res.send(row)
  })
  .catch(function(error) {
    console.log(error);
  });
// Get sheet

    
   
});
 
// Start the server


app.use("/db",dbRoute)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
  console.log('Press Ctrl+C to quit.');
});

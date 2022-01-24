const express = require('express'),
  router = express.Router(),
  asyncHandler = require('express-async-handler'),
  // https://zellwk.com/blog/async-await-express/
  smartsheet = require('../modules/smartsheet'),
 //computers = require('./../constants/computers'),
 // rentals = require('./../constants/rentals'),
 // logging = require('./../modules/logging'),
  bodyParser = require('body-parser').json();

router.use((req, res, next) => {
    if (req.headers['smartsheet-hook-challenge']) {
        res.setHeader('smartsheet-hook-response', req.headers['smartsheet-hook-challenge']);
        res.send({
            smartsheetHookResponse: req.headers['smartsheet-hook-challenge']
        });
    } else {
        next();
    }
});

router.post('/', bodyParser, asyncHandler(async(req, res) => {
    const { rows } = await smartsheet.getSheet('4067414670370692', 'Status');
    const options = rows.map(x => x.cells.length ? x.cells[0].displayValue : false);
    /*await smartsheet.updateColumn(rentals.id, rentals.computer, {
        index: 0,
        type: 'PICKLIST',
        options
    });*/
    var options = {
        sheetId: 4067414670370692, // Id of Sheet
        rowId: 3743601462798212
      };
      
      await smartsheet.sheets.getRow(options)
        .then(function(row) {
          console.log(row);
          //
          res.send(row)
        })
        .catch(function(error) {
          console.log(error);
        });
    res.sendStatus(200);
}));

/*router.use((error, req, res, next) => {
    if (error) {
        logging.err(error);
        res.sendStatus(500);
    } else {
        res.sendStatus(200);
    }
});*/

module.exports = router;
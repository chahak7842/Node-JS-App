let smarClient;           // Smartsheet JS client object

// Dependent libraries
const express = require("express");
const app = express();
const dbRoute = require('./Routes/db')

const bodyParser = require("body-parser");
app.use(bodyParser.json());

const smarSdk = require("smartsheet");

// Initialize client SDK
function initializeSmartsheetClient(token, logLevel) {
    smarClient = smarSdk.createClient({
        // If token is falsy, value will be read from SMARTSHEET_ACCESS_TOKEN environment variable
        accessToken: token,
        logLevel: logLevel
    });
}

// Check that we can access the sheet
async function probeSheet(targetSheetId) {
    console.log(`Checking for sheet id: ${targetSheetId}`);
    const getSheetOptions = {
        id: targetSheetId,
        queryParameters: { pageSize: 1 } // Only return first row to reduce payload
    };
    const sheetResponse = await smarClient.sheets.getSheet(getSheetOptions);
    console.log(`Found sheet: "${sheetResponse.name}" at ${sheetResponse.permalink}`);
}

/*
* A webhook only needs to be created once.
* But hooks will be disabled if validation or callbacks fail.
* This method looks for an existing matching hook to reuse, else creates a new one.
*/
async function initializeHook(targetSheetId, hookName, callbackUrl) {
    try {
        let webhook = null;

        // Get *all* my hooks
        const listHooksResponse = await smarClient.webhooks.listWebhooks({
            includeAll: true
        });
        console.log(`Found ${listHooksResponse.totalCount} hooks owned by user`);

        // Check for existing hooks on this sheet for this app
        for (const hook of listHooksResponse.data) {
            if (hook.scopeObjectId === targetSheetId
                && hook.name === hookName
                // && hook.callbackUrl === callbackUrl   // Might be appropriate for your scenario
            ) {
                webhook = hook;
                console.log(`Found matching hook with id: ${webhook.id}`);
                break;
            }
        }

        if (!webhook) {
            // Can't use any existing hook - create a new one
            const options = {
                body: {
                    name: hookName,
                    callbackUrl,
                    scope: "sheet",
                    scopeObjectId: targetSheetId,
                    events: ["*.*"],
                    version: 1
                }
            };

            const createResponse = await smarClient.webhooks.createWebhook(options);
            webhook = createResponse.result;

            console.log(`Created new hook: ${webhook.id}`);
        }

        // Make sure webhook is enabled and pointing to our current url
        const options = {
            webhookId: webhook.id,
            callbackUrl: callbackUrl,
            body: { enabled: true }
        };

        const updateResponse = await smarClient.webhooks.updateWebhook(options);
        const updatedWebhook = updateResponse.result;
        console.log(`Hook enabled: ${updatedWebhook.enabled}, status: ${updatedWebhook.status}`);
    } catch (err) {
        console.error(err);
    }
}


// This method receives the webhook callbacks from Smartsheet
app.post("/", async (req, res) => {
    try {
        const body = req.body;

        // Callback could be due to validation, status change, or actual sheet change events
        if (body.challenge) {
            console.log("Received verification callback");
            // Verify we are listening by echoing challenge value
            res.status(200)
                .json({ smartsheetHookResponse: body.challenge });
        } else if (body.events) {
            console.log(`Received event callback with ${body.events.length} events at ${new Date().toLocaleString()}`);

            // Note that the callback response must be received within a few seconds.
            // If you are doing complex processing, you will need to queue up pending work.
            await processEvents(body);

            res.sendStatus(200);
        } else if (body.newWebHookStatus) {
            console.log(`Received status callback, new status: ${body.newWebHookStatus}`);
            res.sendStatus(200);
        } else {
            console.log(`Received unknown callback: ${body}`);
            res.sendStatus(200);
        }
    } catch (error) {
        console.log(error);
        res.status(500).send(`Error: ${error}`);
    }
});

/*
* Process callback events
* This sample implementation only logs to the console.
* Your implementation might make updates or send data to another system.
* Beware of infinite loops if you make modifications to the same sheet
*/
var arr2 = [];
async function processEvents(callbackData) {
    if (callbackData.scope !== "sheet") {
        return;
    }

    // This sample handles each event individually.
    // Some changes (e.g. column rename) could impact a large number of cells.
    // A complete implementation should consolidate related events and/or cache intermediate data
    var arr1 = new Array();
    for (const event of callbackData.events) {
        // This sample only considers cell changes
        console.log(`event in Index:`, JSON.stringify(event));
        var rowid;
        
        if(event.objectType === "row"){
            rowid =  event.id;   
        }
        if (event.objectType === "cell" && event.rowId === rowid) {
            console.log(`Cell changed, row id: ${event.rowId}, column id ${event.columnId}`);
           
            // Since event data is "thin", we need to read from the sheet to get updated values.
            const options = {
                id: callbackData.scopeObjectId,             // Get sheet id from callback
                queryParameters: {
                    rowIds: event.rowId.toString()    // Just read one column
                }
            };
          //  ,         // Just read one row
           //         columnIds: event.columnId.toString()
            const response = await smarClient.sheets.getSheet(options);
            const row = response.rows[0];
            console.log('**** New row value ',JSON.stringify(row));
            const cell = row.cells[0];
            console.log('**** New row.cells value ',JSON.stringify(row.cells));
            const column = response.columns.find(c => c.id === '421000981571460'); //status
            const column1 = response.columns.find(c => c.id === "3832019985688452");  //CaseNumber
            //const column2 = response.columns.find(c => c.title === "Status");
            console.log('**** column ',column);
            console.log('**** column1 ',column1);
            console.log(`**** New cell value "${cell.displayValue}" in column "${column.title}", row number ${row.rowNumber}`);
            if (event.eventType === "created"){
                if (column.title === "Status"){
                  arr1[1]=cell.displayValue;
                } 
                if (column.title === "CaseNumber"){
                  arr1[0]=cell.displayValue;
                } 
              } 
              if (event.eventType === "updated"){
                if (column.title === "Status"){
                    arr1[1]=cell.displayValue;
                  } 
                  if (column.title === "CaseNumber"){
                    arr1[0]=cell.displayValue;
                  } 
              } 
              console.log(`arr1 in index:`, arr1);
             
        }
        dbRoute.updatePostgress(event,arr1);
    }
    
}

// main
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
//module.exports = app

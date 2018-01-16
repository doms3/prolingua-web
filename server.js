// Import statements
const express = require( 'express' );
const app = express();
const parser = require( 'body-parser' );
const fs = require( 'fs' );
const { exec } = require('child_process');
const path = require("path");

// Redefining console.log as log because I'm too lazy to write out 7 characters
const log = console.log;

// Setting up the server settings
app.use( express.static( 'public' ) );

//// These 2 lines allow the server to see the body of incoming POST requests
app.use( parser.urlencoded( { extended: false } ) );
app.use( parser.json() ); 

// Server starts to listen on port 8080
const portNum = '8080';
app.listen( portNum, () => log( 'Server was started on port ' + portNum ) );

// We listen for POST requests at the /compile/ path on the client side
app.post( '/compile/', ( request, response ) => {
    // Incoming requests contain raw prolingua code and the original language
    let txt = request.body.text;
    let lang = request.body.language;
    
    // Each user is given a unique 5 character id for their visit
    let current_id = randomString();

    log( 'File was received from ' + request.ip + '. Client was assigned user ID: ' + current_id );

    let prolinguaCodeAlias = 'prolingua__' + current_id + '.txt';
    let compiledCodeAlias = 'compiled__' + current_id + '.py';

    fs.writeFile( prolinguaCodeAlias, txt, ( err ) => {
        // These are the two absolute paths of the raw and compiled files
        let writePath = path.resolve( prolinguaCodeAlias );
        let readPath = path.resolve( compiledCodeAlias );

        // This line calls the java compiler, if you're having issues be sure the included batch script has been run
        let cmd = 'gradle run -p prolingua -PrunArgs=\"' + writePath + ' ' + readPath + ' ' + lang + '\"';

        // Executing the above command
        exec( cmd, ( error, stdin, stderr ) => {
            if( error === null && stderr === '' ) {
                log( 'File was compiled for user ' + current_id + '. Awaiting download...' );
                // Sends the client a link to download their file
                let link = '/download/' + current_id + '/';
                response.status( 200 ).send( { link: link } );
                // Opens a route to download the users compiled file
                app.get( link, (req, res) => {
                    log( 'File sent to user ' + current_id + '.' );
                    res.download( compiledCodeAlias, compiledCodeAlias, ( e ) => exec( 'del ' + compiledCodeAlias, null ) ) 
                });
                exec( 'del ' + prolinguaCodeAlias, null );
            } 
            // There's some VERY lazy error checking here, will have to be addressed
            else if( error === null ) {
                response.status( '500' ).end();
                log( 'An error was encountered with user ' + current_id + '.' );
                exec( 'del ' + prolinguaCodeAlias, null );
                exec( 'del ' + compiledCodeAlias, null );
            } else {
                response.status( '500' ).end();
                log( 'An error was encountered with user ' + current_id + '.' );
                exec( 'del ' + prolinguaCodeAlias, null );
                exec( 'del ' + compiledCodeAlias, null );
            }
        } );
    } );
} );

// A simple function for generating user ids, obviously this is pseudo-random
function randomString() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < 5; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
}
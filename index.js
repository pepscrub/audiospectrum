const   express = require('express'),           // HTTP server module
        bodyParser = require('body-parser'),    // module allows for Form data parsing via POST
        multiparty = require('multiparty'),     // Used to parse File data from POST
        fs = require('fs'),                     // File System module
        port = process.env.PORT || 8888,        // Grabbing environment variable port value or listening on 8080
        app = express(),                        // HTTP server entry point
        error = console.error,                  // Entry point for all errors
        log = console.log,                      // Entry point for all console logs
        color = require('chalk'),               // Colored terminal (used for errors primarly)

        // Importing sensitive data from secrets.json. Use environment variables in final release
        secrets = JSON.parse(fs.readFileSync('secret.json', 'utf8')),
        // SPOTIFY OAUTH MODULES
        request = require('request'),                                                               // Request libary
        querystring = require('querystring'),                                                       // Query string used to read response from spotify
        cookieParser = require('cookie-parser'),                                                    // Session initalizations (cookie management)
        // SPOTIFY VARIABLES
        client_id = secrets['client_id'] || 'YOUR_CLIENT_ID',                                       // Grabs client_id from secrets.json. If there's no result defaults to text
        client_secret = secrets['client_secret'] || 'YOUR_CLIENT_SECRET',                           // ditto
        redirect_uri = `http://localhost:${port}/callback`,                                                // Callback for spotify (must be defined in spotify application under settings)
        generateRandomString = (length) =>{                                                         // Function generates random string characters to specified length
            let     text = '';                                                                     
            const   possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';    // Using const as a safety measure since we don't want to modify the variable afer it's set.
            for(var i = 0; i < length; i++){                                                        // Looping through the disired length and randomly picking a character from the possible string
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            return text;                                                                            // Retruning the randomized text
        },
        // * Scope outlines
        // user-read-playback-state
        // ▪ Get information about the user's current playback
        // ▪ Get user's currently playing track 
        // user-modify-playback-state
        // ▪ Pause/Play track
        // ▪ Seek to position
        // ▪ Set volume
        // We also need to access the users details to see if the user in question is premium or not (user-read-private)
        scope = 'user-read-playback-state user-modify-playback-state user-read-private'
        state_key = 'spotify_auth_state';
// Middleware
app.use(express.static(__dirname+'/public')).use(cookieParser());       // Serves all the files in the current directory (Cookie parser lets us initate a session on all the pages we're serving)
app.use(bodyParser.json())                                              // Allows the use of JSON in POSTS/GETS
app.use(bodyParser.urlencoded({ extended: true }));                     // Allow for headers with Content-Type: application/x-www-form-urlencoded

// SPOTIFY API

app.get('/login', (req, res)=>{
    log(color.greenBright.bold(`[Spotify] `) + `User attemping login`)
    const state = generateRandomString(16); // Defining state via random string function
    res.cookie(state_key, state);           // Assigning state to cookie
    // Application redirect
    let uri = querystring.stringify({
        response_type: 'code',              // Tell spotify this is for code
        client_id: client_id,               // give it the application id
        scope: scope,                       // Scope defines the needs of the application
        redirect_uri: redirect_uri,         // The callback page
        state: state                        // Randomized string that we assigned to a cookie
    })
    res.redirect(`https://accounts.spotify.com/authorize?${uri}`)
})

app.get('/callback', (req, res)=>{
    const   code = req.query.code || null,                              // If the code response false set to false
            state = req.query.state || null,                            // Ditto
            storedState = req.cookies ? req.cookies[state_key] : null;  // If cookies exist grab cookies via state key else null
    if(state === null || state !== storedState){                        // If the states between the requested and stored don't align or the requested state is not defined
        error(color.red.bold(`[Error] `)+ `State mismatch!\nRequest: ${state}\nStored: ${storedState}`);
        return                                                          // Exiting to clean up else
    }
    log(color.greenBright.bold(`[Spotify] `) + `User logged in!`)
    res.clearCookie(state_key);
    const authOptions = {
        url: 'https://accounts.spotify.com/api/token',
        form: {
            code: code,
            redirect_uri: redirect_uri,
            grant_type: 'authorization_code'
        },
        headers: {
            'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
        },
        json: true
    };
    log(color.greenBright.bold(`[Spotify] `) + `Now attempting to get an access token`)
    request.post(authOptions, (err, response, body)=>{                                                                            // Querying spotify for relevant info
        if(err && response.statusCode !== 200) return error(color.red.bold(`[Error] `)+ `${response.statusCode}. ${err}`);
        if(body.error !== undefined){
            error(color.red.bold(`[Error] `)+ `Spotify oAuth error: ${body.error}`);
            res.redirect('http://localhost:8888/');
            return;
        }
        const   access_token = body.access_token,                                                                                   // Grabbing access token
                refresh_token = body.refresh_token;                                                                                 // Grabbing refresh token
        res.redirect(`http://localhost:8888/?${querystring.stringify({access_token: access_token, refresh_token:refresh_token})}`)  // Redirecting to main page with uri with relevant info
        log(color.greenBright.bold(`[Spotify] `) + `Connected successfully!`)
    })
})

app.get('/refresh_token', (req, res)=>{
    // Requesting access token from refresh token
    const   refresh_token = req.query.refresh_token,
            authOptions = {
                url: 'https://accounts.spotify.com/api/token',
                headers: {'Authorization': `Basic ${new Buffer.from(client_id+':'+client_secret).toString('base64')}`},
                from:{
                    grant_type: 'refresh_token',
                    refresh_token: refresh_token
                },
                json: true
            };
    request.post(authOptions, (error,response,body)=>{
        if(err && response.statusCode !== 200) return error(color.red.bold(`[Error] `)+ ` ${err}`);
        const access_token = body.access_token;
        res.send({
            'access_token': access_token
        });
    });
});


// FILE UPLOAD

app.post('/api', (req, res)=>{  // Create entry point for /api for POSTS
    
    try{
        const form = new multiparty.Form()                                              // Creating form object
        form.parse(req, (err, fields, files)=>{                                         // Parsing through POST content
            if(err) return error(color.red.bold(`[Error] `)+ err)
            // If the submitted file type does not contain audio in headers
            const file_type = files['file'][0]['headers']['content-type'];              // Grabbing what file type the headers sent out
            if(!/audio/g.test(file_type)){                                              // Looking at headers to see if the content type contains audio
                res.status(500).send({500: 'invalid file type'});
                error(color.red.bold(`[Error] `)+ `Invalid content type! ${file_type}`);
                return;                                                                 // Exiting function to not call other status code
            }
            res.status(200).send({200: 'ok!'})                                          // Send status code (our fetch code requires this)
            save_file(files['file'][0])                                                 // Grabbing first file (only expected singular file input)
        })
    }catch(exception){                                                                  // Catching any 500 errors that occur
        res.status(500).send({500: exception});                                         // Telling client that a server error occured
        error(color.red.bold(`[Error] `) + `Server error occured while parsing: ${file}`)
    }
})

save_file = (file_data) =>{
    const   file_temp = file_data['path'],                                         // Grabbing the temp location of the file sent to our server
            file_name = file_data['originalFilename'].replace(/\#/g, '');          // Grabbing the original file name that was uploaded
    if(!fs.existsSync('public/music')){                                            // Creating music folder if it doesn't exist
        fs.mkdirSync('public/music')
    }
    try{
        // Creating function to which access later
        const write_file = (data) =>{                                               // Data retrived via readfile
            const file_path = `public/music/${file_name}`;                          // Defining file path location
            if(!fs.existsSync(file_path)){                                          // Checking to see if the file doesn't exist
                fs.writeFile(file_path, data, (err)=>{                              // Creating the file using data retrived via read file
                    if(err) error(color.red.bold(`[Error] `) + err)
                })
            }
        }
        fs.readFile(file_temp, {}, (err, data)=>{               // Reading temp file and sending data off to write_file function
            if(err) error(color.red.bold(`[Error] `) + err); 
            write_file(data);
        })
    }catch(exception){
        error(color.red.bold(`[Error] `) + exception)
    }
}
// Create server
app.listen(port, ()=>{console.log(`Server is listening on port: ${port}`)})


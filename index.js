const   express = require('express'),           // HTTP server module
        bodyParser = require('body-parser'),    // module allows for Form data parsing via POST
        multiparty = require('multiparty'),     // Used to parse File data from POST
        fs = require('fs'),                     // File System module
        port = process.env.PORT || 8080,        // Grabbing environment variable port value or listening on 8080
        app = express(),                        // HTTP server entry point
        error = console.error,                  // Entry point for all errors
        color = require('chalk');               // Colored terminal (used for errors primarly)
// Middleware
app.use(express.static(__dirname+'/public'));                 // Serves all the files in the current directory
app.use(bodyParser.json())                          // Allows the use of JSON in POSTS/GETS
app.use(bodyParser.urlencoded({ extended: true })); // Allow for headers with Content-Type: application/x-www-form-urlencoded

app.post('/api', (req, res)=>{  // Create entry point for /api for POSTS
    
    try{
        const form = new multiparty.Form()                          // Creating form object
        form.parse(req, (err, fields, files)=>{                     // Parsing through POST content
            if(err) return error(color.red.bold(`[Error] `)+ err)
            save_file(files['file'][0])                             // Grabbing first file (only expected singular file input)
        })
        res.status(200).send({200: 'ok!'})                          // Send status code (our fetch code requires this)
    }catch(exception){                                              // Catching any 500 errors that occur
        res.status(500).send({500: exception});                     // Telling client that a server error occured
        error(color.red.bold(`[Error] `) + `Server error occured while parsing: ${file}`)
    }
})

save_file = (file_data) =>{
    const   file_type = file_data['headers']['content-type'],   // Grabbing what file type the headers sent out
            file_temp = file_data['path'],                      // Grabbing the temp location of the file sent to our server
            file_name = file_data['originalFilename'];          // Grabbing the original file name that was uploaded
    // If the submitted file type does not contain audio in headers
    if(file_type !== 'audio/mp3') return error(color.red.bold(`[Error] `)+ `Invalid content type! ${file_type}`);
    try{
        // Creating function to which access later
        const write_file = (data) =>{                               // Data retrived via readfile
            const file_path = `public/music/${file_name}`;          // Defining file path location
            if(!fs.existsSync(file_path)){                          // Checking to see if the file doesn't exist
                fs.writeFile(file_path, data, (err)=>{              // Creating the file using data retrived via read file
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


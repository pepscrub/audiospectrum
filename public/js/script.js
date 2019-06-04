// Grabbing elements
const file = document.getElementById("thefile"),
      loader_node = document.querySelector('.loader_container'),
      audio = document.getElementById("audio"),
      range_node = document.querySelector('.player_current'),
      pause_node = document.querySelector('.player_pause'),
      volume_icon = document.querySelector('.icon'),
      album_cover = document.querySelector('.cover'),
      title_node = document.querySelector('.player_title'),
      genre_node = document.querySelector('.player_genre'),
      artist_node = document.querySelector('.player_artist'),
      duration_node = document.querySelector('.duration'),
      volume_slider = document.querySelector('.slider');
let connect = false,    // If the canvas is already connected
    muted = false,      // If the user toggles mute
    mouse_down = false, // Mouse down event
    pause = true;       // If the audio is paused


// Code related to when dragging a file onto the window
// (Basically show the giant input field to drop the file into)
const drop_content = document.querySelector('.drop_content'),   // Targeting the drop message element. (Black background with text)
      input = document.querySelector('#thefile')                // Targeting input file

// Once the file is dragged onto the page
window.addEventListener('dragenter', (e)=>{
  drop_content.style.opacity = '1'
  input.style.opacity = '.0000000000000000001' // We still need the input to be visable to drop the file into so we set the opacity very low
})
// Listening for the instance when the user drops the content
window.addEventListener('drop', (e)=>{
  document.querySelector('.player_current').classList.remove('progress_not_seeking') // Update player seeker (progress not seeking has an animation directly targeting width changes)
  drop_content.style.opacity = '0'
  input.style.opacity = '0'
})
// Listening for when the user drags content off the window
window.addEventListener('dragleave', (e)=>{
  drop_content.style.opacity = '0'
  input.style.opacity = '0'
})

window.onload = () => {
    spotify();
    loader_node.style.opacity = '0'; // Fading out loader
    setTimeout(()=>{loader_node.remove()},125)
    // Play/Pause button
    pause_node.innerHTML = `<i class="fas fa-pause"></i>`
    pause_node.addEventListener('click', (e)=>{
      if(pause){
        pause = false;
        audio.pause();
        pause_node.innerHTML = `<i class="fas fa-play"></i>`
      }else{
        audio.play();
        pause = true;
        pause_node.innerHTML = `<i class="fas fa-pause"></i>`
      }
    })
    // When the user clicks on the speaker icon toggle between MUTE and UNMUTED

    volume_icon.addEventListener('click',()=>{
      if(!muted){ // Not muted
        muted = true; 
        audio.volume = 0;
        volume_icon.innerHTML = '<i class="fas fa-volume-mute"></i>'
      }else{
        muted = false;
        // Grabbing volume from localstorage if the item exists (basically the same as the slider)
        audio.volume = localStorage.getItem('volume') != undefined ? localStorage.getItem('volume') : 1
        volume_icon.innerHTML = '<i class="fas fa-volume-up"></i>'
      }
    })
    document.querySelector('.slider').value = localStorage.getItem('volume') != undefined ? localStorage.getItem('volume') * 100 : .5 // Volume resetting
    file.onchange = function(){
      file_change(this.files);
    }
  };

function file_change(file_update){
  if(file_update === undefined) return;
  if(file_update.length === 0) return;
  album_cover.style.opacity = '0'
  setTimeout(()=>{range_node.classList.add('progress_not_seeking')},125) // Making the progress bar snap back to the start
  let files = file_update,
      name_regex = files[0]['name'].replace(/\#/g, '');           // Hashtags were causing errors
      file_url = `${location.href}music/${encodeURI(name_regex)}`,
      clean_name = name_regex.replace(/\.([0-9A-Za-z]{3})$/, ''),
      url_blob = URL.createObjectURL(files[0]);
  // Grabs audio file and creates a blob
  // TODO: CREATE SPINNER FOR LOADING ITEMS
  save_file(files[0], file_url, clean_name);
  audio.src = url_blob;
  audio.load(); // Loads audio file
  // Enables audio rendering
  // ▪ samplerate 
  // ▪ positional sound values
  // ▪ output mode (speakers/headphones)
  // ▪ Number of speakers
  // ▪ Number of audio outputs
  let context = new AudioContext();
  // Once connected just keep the current connection alive 
  if(!connect){
    connect  = true;
    var src = context.createMediaElementSource(audio);
    var analyser = context.createAnalyser();
  }
      

  let duration = 100; // Default duration
  audio.addEventListener('loadedmetadata', (e)=>{ // Once the audio file loads metadata
    duration = parseInt(audio.duration); // Loading duration (using parse int because it automagically rounds down)
    range_node.setAttribute('max', duration) // Modifying progress bar max to the duration of the song
    pause = true;
    pause_node.innerHTML = `<i class="fas fa-pause"></i>`
  })

  // Updating the value of the progress bar based on the audios current time

  audio.addEventListener('timeupdate', ()=>{
    let currtime = parseInt(audio.currentTime, 10),
        timer_actual = (number) =>{return parseInt(number) < 10 ? '0'+parseInt(number) : parseInt(number)},
        duration_actual = audio.duration,
        currtime_actual = audio.currentTime,
        // audio times don't give out actual times
        // ▪  using divide we can get the minutes
        // ▪  using modulas we can get the seconds
        curr_timer = `${timer_actual(currtime_actual / 60)}:${timer_actual(currtime_actual % 60)} / ${timer_actual(duration_actual / 60)}:${timer_actual(duration_actual % 60)}`
    if(/NaN/g.test(curr_timer)) curr_timer = '00:00 - 00:00'; // Timer can start before the metadata actually loads
    duration_node.innerHTML = curr_timer;
    range_node.setAttribute('value', currtime) // Modifying the value
    if(currtime == range_node.max){
      pause = false;
      pause_node.innerHTML = `<i class="fas fa-play"></i>`
    }
  }) 

  // Calculating where to seek the time to when clicked and when seeking through the song
  let update_progress_node = (e) =>{
    // Click coordinate (on node) / the current inner window width times the duration of the current music track
    // ▪ Did this to avoid using a range slider (no sources online on modifying the track to have a colored slider behind the time elapsed)
    //    ▪  Possible to fix with ::after tags but would require more JS to function properly
    let amount = Math.round((e.x / innerWidth) * duration)
    audio.currentTime = parseInt(amount, 10);
    range_node.setAttribute('value', amount);
    audio.play();
  }
  range_node.addEventListener('click', (e)=>{ // If they click
    update_progress_node(e);
  })
  range_node.addEventListener('mousedown', (mouse_event)=>{ // Used for 'live seeking'
    range_node.classList.remove('progress_not_seeking')
    mouse_down = true; 
  })
  window.addEventListener('mouseup', (e)=>{ // Used for live seeking. Using window instead so if the user drags off the bar it doesn't glitch out
    setTimeout(()=>{
      range_node.classList.add('progress_not_seeking')
    }, 125)
    mouse_down = false;
  })
  window.addEventListener('mousemove', (e)=>{ // Once the mouse moves on the window
    if(!mouse_down) return  // mousedown defined when the user clicks down on the seeker. Did this so you dont have to be on the slider to move it;                       
    update_progress_node(e);
  })
  
  audio.volume = volume_slider.value / 100 // Resetting volume to the sliders value (slider rendered on DOM)
  


  // Making variable function to access later

  let volume_icon_change = () =>{
    let volume = volume_slider.value / 100 // Division required since audio.volume takes a int between 0 and 1
        audio.volume = volume
    // Storing current volume into storage
    localStorage.setItem('volume', volume)
    // Making the icon change based on audio level
    // 0 is muted
    // 0-59 is a speaker with 2 wave things
    // 60-100 is a speaker icon with all those wave things
    if(volume_slider.value > 0 || volume_slider.value < 60){ 
      volume_icon.innerHTML = '<i class="fas fa-volume-down"></i>'
    }
    if(volume_slider.value == 0){
      volume_icon.innerHTML = '<i class="fas fa-volume-mute"></i>'
    }
    if(volume_slider.value >= 60){
      volume_icon.innerHTML = '<i class="fas fa-volume-up"></i>'
    }
  }

  // Adding events to volume slider
  // We can assume that the mouse movements on the slider are changes to volume (doesn't really effect the user end anyways)
  volume_slider.addEventListener('mousemove', ()=>{
    volume_icon_change()
  })
  // Adding an event listener once the DOM node changes e.g. if the user just clicks to a new volume
  volume_slider.addEventListener('change', ()=>{
    volume_icon_change()
  })
      
  // Setting the title of the document to the mp3 currently playing
  // ▪ Could replace the regex with jsmediatags name attribute

  document.querySelector('title').innerHTML = clean_name

  // Reading the audio files metadata 
  // File url refers to the audio files blob
      
  let canvas = document.getElementById("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var ctx = canvas.getContext("2d");

  canvas.style.background = ''

  try{ // No matter what I try here it throws an error
    src.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 1024;

    var bufferLength = analyser.frequencyBinCount;

    var dataArray = new Uint8Array(bufferLength);

    var WIDTH = canvas.width;
    var HEIGHT = canvas.height;

    var barWidth = (WIDTH / bufferLength) * 5;
    var barHeight = HEIGHT;
    var x = 0;

    function renderFrame() {
      requestAnimationFrame(renderFrame);

      x = 0;

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (var i = 0; i < 512; i++) {
        barHeight = dataArray[i];
                
        let r = barHeight + (25 * (i/bufferLength));
        let g = 250 * (i/bufferLength);
        let b = 50;

        ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
        ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);

        x += barWidth + 1.5;
      }
    }
    renderFrame();

    // Rescaling the canvas when the window is scaled
    window.addEventListener('resize', ()=>{
      barWidth = (WIDTH / bufferLength) * 5;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      WIDTH = canvas.width;
      HEIGHT = canvas.height;
      renderFrame();
    })
  }catch(e){
    console.log(e)
  }
}


function save_file(file, url, name){
  let   file_already_saved = false,
        file_exist_test = (url) =>{         // Fetch the file and see if it exists already
          fetch(url)
          .then(res=>{
            if(res.status === 200){         // Fetch will respond with 200 if the file is found
              file_already_saved = true;    // Update check variable to true (since it found the file)
            }
          })
        }
  console.log(url)
  console.log(name)
  file_exist_test(url);
  if(file_already_saved) return read_file(url, name);             // Exiting function if the file exists
  let formData = new FormData(), api_url = `${location.href}api`; // Connecting to API
  formData.append('file', file)                                   // appending form data for POST 
  fetch(api_url,{method: 'POST',body: formData})
  .then(res=>{
    if(res.status === 200){                 // Executing if the POST was sent
      console.log(res.json())
      let update_test = setInterval(()=>{   // Creating a loop to check every 500ms (should take less than this to update)
        file_exist_test(url);               // Calling check function
        if(file_already_saved){             // Checking to see if the variable changes to tru
          clearInterval(update_test)        // Stopping loop
          read_file(url, name)              // Reading file
        }
      }, 1000)
    }else{
      // Do code stuff
    }
  })
}

function fade(node, type, data, amount){
  const fade_in_out = () =>{
    node.style.opacity = '0';     // Setting the element's opacity to 0 by default
    setTimeout(()=>{              // after the specified time update the fade
      if(type == 'text'){         // Checking to see if the specified type is text
        node.textContent = data;  // Update elements text
      }
      node.style.opacity = '1';   // Update the elements opacity
    }, amount)                    // Delay by the specified amount
  }
  // Testing to see if the style's opacity has been set
  if(node.style.opacity == '' || node.style.opacity == undefined)
  {
    fade_in_out();
  }
  // If the opacity is 1
  else if (node.style.opacity == '1') 
  {
    fade_in_out();
  }else{
    console.log(node.style.opacity);
  }
}

function spotify_connected(calling){
  const search_parameters = new URLSearchParams(window.location.search),          // Creating object based of URL search parameters
        access_token = search_parameters.get('access_token'),                     // Grabbing access from URL
        refresh_token = search_parameters.get('refresh_token');                   // Grabbing refresh from URL
  if(access_token !== null || refresh_token !== null){
    localStorage.setItem('spotify_atoken', access_token);                         // Storing in local storage to access when user refreshes
    localStorage.setItem('spotify_rtoken', refresh_token);
  }
  // If theres no data to even retrive and the user has not interacted with the login uri
  if(access_token === null && refresh_token == null && localStorage.getItem('spotify_atoken') === null && localStorage.getItem('spotify_rtoken') === null) return false
  window.history.pushState(null, null, `${location.origin}${location.pathname}`)  // Resetting URL to make it look cleaner (this doesn't refresh the page)
  return spotify_player(calling);
}
// Required async await files due to response times from the spotify API
async function spotify_player(userinforequired){
  const access_token = localStorage.getItem('spotify_atoken');
  let player_data = []
  // So we dont call for user data past the inital message
  if(!userinforequired){
    await fetch('https://api.spotify.com/v1/me', {headers:{'Authorization': 'Bearer '+access_token}})
    .then((res)=>{
      if(res.status === 200) return res.json();             // Returning the queried data
    })
    .then((res)=>{
      player_data.push({'user_info': res['product']})      // Pushing data relating to the users premium or not
    })
  }
  // Getting the currently playing
  player_data.push({'player_curr': await spotify_current()})
  return player_data;                                     // return this data
}
async function spotify_current(){
  const access_token = localStorage.getItem('spotify_atoken');
  let data = await {};
  // Getting the currently playing
  await fetch('https://api.spotify.com/v1/me/player/currently-playing', {headers:{'Authorization': 'Bearer '+access_token}})
  .then((res)=>{
    if(res.status === 200) return res.json();             // Returning the queried data
    if(res.status === 204) return {'state': 'inactive'}   // If spotify isn't opened and there's no track to get data from
  })
  .then((res)=>{
    data = res;
  })
  return data
}
async function spotify(){
  const access_token = localStorage.getItem('spotify_atoken'),
        options = {method: 'PUT',headers:{'Authorization': 'Bearer '+access_token}};
  let required_info = await spotify_connected(false);       // Grabbing current player information
  if(!required_info) return;                                // Returning if there's no login information to retrive
  let user_info = required_info[0]['user_info']             // Defining userinfo for product information
      current = required_info[1]['player_curr'];            // Grabbing current info for error debugging
  if(!required_info[1]['state']) return;                    // Exit function if the user stops spotify all together
  spotify_data(await spotify_connected(true))               // Sending data to our DOM maniuplator
  // Setting up entry point for retriving data
  // Setting a loop to a timer to retrive data from the spotify API
  setInterval(async ()=>{
    const required_info = await spotify_connected(true);    // Grabbing current player information
    spotify_data(required_info)
  }, 3000)
  file.remove();                                            // Removing input file to stop file uploads *TEMP

  // Removing items based of the users level (cannot use pause/play functionality if the user is not a premium user)
  if(user_info !== 'premium'){
    let volume_node = document.querySelector('.volume')
    volume_node.style.opacity = 0
    pause_node.style.opacity = 0;
    setTimeout(()=>{
      pause_node.remove();
      volume_node.remove();
    }, 125);
  }

  const change_volume = (percent) =>{
    fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${percent}`, options)
  },
  volume_icon_change = () =>{
    let volume = volume_slider.value / 100 // Division required since audio.volume takes a int between 0 and 1
    change_volume(volume_slider.value)
    // Storing current volume into storage
    localStorage.setItem('volume', volume)
    // Making the icon change based on audio level
    // 0 is muted
    // 0-59 is a speaker with 2 wave things
    // 60-100 is a speaker icon with all those wave things
    if(volume_slider.value > 0 || volume_slider.value < 60){ 
      volume_icon.innerHTML = '<i class="fas fa-volume-down"></i>'
    }
    if(volume_slider.value == 0){
      volume_icon.innerHTML = '<i class="fas fa-volume-mute"></i>'
    }
    if(volume_slider.value >= 60){
      volume_icon.innerHTML = '<i class="fas fa-volume-up"></i>'
    }
  }


  volume_icon.addEventListener('click',()=>{
    if(!muted){ // Not muted
      muted = true; 
      change_volume(0)
      volume_icon.innerHTML = '<i class="fas fa-volume-mute"></i>'
    }else{
      muted = false;
      // Grabbing volume from localstorage if the item exists (basically the same as the slider)
      change_volume(localStorage.getItem('volume') != undefined ? localStorage.getItem('volume') : 1)
      volume_icon.innerHTML = '<i class="fas fa-volume-up"></i>'
    }
  })

  // Adding events to volume slider
  // We can assume that the mouse movements on the slider are changes to volume (doesn't really effect the user end anyways)
  volume_slider.addEventListener('mousemove', ()=>{
    volume_icon_change()
  })
  // Adding an event listener once the DOM node changes e.g. if the user just clicks to a new volume
  volume_slider.addEventListener('change', ()=>{
    volume_icon_change()
  })


  document.querySelector('.slider').value = localStorage.getItem('volume') != undefined ? localStorage.getItem('volume') * 100 : .5 // Volume resetting

  pause_node.addEventListener('click', (event)=>{
    if(pause){
      fetch(`https://api.spotify.com/v1/me/player/play`, options)
      pause = false;
      pause_node.innerHTML = `<i class="fas fa-play"></i>`
    }else{
      fetch(`https://api.spotify.com/v1/me/player/pause`, options)
      pause = true;
      pause_node.innerHTML = `<i class="fas fa-pause"></i>`
    }
  })
}


function spotify_data(data){
  const player_curr_items = data[0]['player_curr']['item'],
        song_link = player_curr_items['external_urls']['spotify'],
        player_duration = player_curr_items['duration_ms']
        player_curr_img = player_curr_items['album']['images'][0] == undefined ? 'imgs/default.png' : player_curr_items['album']['images'][0]['url'], // 640px image
        player_curr_artist = player_curr_items['artists'],
        player_name = player_curr_items['name'];
  let artists = '',
      player_curr_time = data[0]['player_curr']['progress_ms'],
      count = 1,
      current_time = `${(`${Math.round((player_curr_time / 60500) * 100) / 100}`).replace('.', ':')}`,
      duration_time = `${(`${Math.round((player_duration / 60500) * 100) / 100}`).replace('.', ':')}`;
  player_curr_artist.forEach((artist)=>{
    let url = artist.external_urls.spotify,
        name = artist.name,
        node = `<a href="${url}">${name}</a>`
    if(player_curr_artist.length == count){
      artists += ' '+node
    }else{
      artists += `${node},`
    }
    count+=1;
  })

  // Modifying DOM

  current_time = `${(`${Math.round(((player_curr_time) / 60500) * 100) / 100}`).replace('.', ':')}`;
  duration_time = duration_time.length == 4 ? duration_ntime : duration_time + '0';
  current_time = current_time.length == 4 ? current_time : current_time + '0';
  duration_node.textContent = `${current_time} / ${duration_time}`
  genre_node.textContent = ''
  title_node.innerHTML = `<a href="${song_link}">${player_name}</a>`;
  artist_node.innerHTML = artists;
  range_node.classList.remove('progress_not_seeking');
  range_node.classList.add('progress_spotify')
  range_node.value = player_curr_time;
  range_node.max = player_duration;
  album_cover.src = player_curr_img
}

function read_file(file_url, clean_name){
        jsmediatags = window.jsmediatags;
  let img = 'imgs/default.png' // Defining the default image (Incase no image from the audio file is present)
  jsmediatags.read(file_url, {
    onSuccess:(tags)=>{
      console.log('%c[jsmediatags]'+`%c Tag data`, 'color: #fb0032;font-weight: bold;', 'color: #fff;')
      console.log(tags)
      let   tag = tags.tags,
            artist = tag.artist != '' ? tag.artist : '',
            genre = tag.genre  != '' ? tag.genre : '',
            // If there's no title tag use the name from the file or if the name doesnt match the one given by the file use the file one
            title = tag.title != undefined ? tag.title : clean_name,
            picture = tag.picture,
            base64string = '';

      title = tag.title == clean_name ? tag.title : clean_name
      // Modifying DOM nodes to have the current audio
      fade(title_node, 'text', title, 150);
      fade(artist_node, 'text', artist, 175);
      fade(genre_node, 'text', genre, 200);

      title_node.parentNode.removeAttribute('href');
      artist_node.parentNode.removeAttribute('href');


      if(/soundclown/ig.test(genre) || /shitpost/ig.test(genre)){
        document.querySelector('.background_img_container').classList.add('shitpost')
      }else{
        document.querySelector('.background_img_container').classList = 'background_img_container';
      }

      try{ // Some audio files may not have attributes showing where it was downloaded
        let origin_artist = tag.WOAR.data != undefined ? tag.WOAR.data : '',
          origin = tag.WOAS.data != undefined ? tag.WOAS.data : '';
        title_node.parentNode.setAttribute('href', origin)
        artist_node.parentNode.setAttribute('href', origin_artist)
      }catch(e){
        console.log('%c[jsmediatags]'+`%c Couldn\'t find where ${clean_name} was downloaded`, 'color: #fb0032;font-weight: bold;', 'color: #fff;')
      }
      try{
        if(picture !== undefined){ // Testing to see if picture exists
          picture.data.forEach((data)=>{ // Picture data contains array with base64 data
            base64string += String.fromCharCode(data) // appending to string
          })
          img = `data:${picture.format};base64,${window.btoa(base64string)}` // formatting to image src
        }
      }catch(e){
        img = 'imgs/default.png' // If there's an error with the image print the default one
      }
      setTimeout(()=>{
        album_cover.src = img; // Modifying the image 
        album_cover.style.opacity = '1'
      },125)
      document.querySelector('.background_image').src = img; // Modifying the image 
      audio.play(); // Playing audio once the data has loaded
    },
    onError:(err)=>{
      title_node.textContent = clean_name
      album_cover.src = img;                                  // Modifying the image 
      album_cover.style.opacity = '1'
      document.querySelector('.background_image').src = img;  // Modifying the image 
      audio.play(); // Playing audio
      console.log(err)
    }
  })
}
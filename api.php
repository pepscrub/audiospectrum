<?php
// May replace with nodeJS server once I learn it.
if($_SERVER['REQUEST_METHOD'] === 'POST'){
    if(isset($_FILES['file'])){
        $errors = []; // Checking if empty at end of code block
        $path = 'music/'; // Save path 
        $extension = ['mp3', 'wav', 'flac', 'audio/mpeg']; // Allowed music types (webm is apperently a music type)

        $file_name = $_FILES['file']['name'];
        $file_tmp = $_FILES['file']['tmp_name'];
        $file_type = $_FILES['file']['type'];
        $file_size = $_FILES['file']['size'];
        $response = explode('.', $file_name); // seperating name and extension type
        $file_ext = $response[1];
        $file_ext_2 = $response[2];
        $file = $path . $file_name; 

        if (!in_array($file_ext, $extension) && !in_array($file_ext_2, $extension)) { // Checking to see if the extension is allowed
            $errors[] = 'Extension not allowed: ' . $file_name . ' ' . $file_type;
        }

        if ($file_size > 24000000) { // Checking to see if file is more than 24 MB (modify PHP.ini to allow more for file uploads. Default is 2mb)
            $errors[] = 'File size exceeds limit: ' . $file_name . ' ' . $file_type;
        }
        if (empty($errors)) {
            try{
                move_uploaded_file($file_tmp, $file);                
            }catch(Exception $e){
                var_dump($e);
            }
        }
        if ($errors){
            print $file_type . '<br>' . $file_ext . '<br>';
            var_dump($response);
            print_r(json_encode($errors));
        }
    }
}
?>
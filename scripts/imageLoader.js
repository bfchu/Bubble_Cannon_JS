// variables used for image preloader
var numImagesRequested = 3;
var numImagesLoaded = 0;
var images = {}

function loadImage(imageName) {
	var image = new Image();
	images[imageName] = image;
	
	image.onload = onImageLoaded;
	image.src = "images/" + imageName + ".png";
}

// this function is called once for each image loaded.
function onImageLoaded() {
	++numImagesLoaded;
	
	// start game only after we know all images have been loaded.
	if(numImagesLoaded == numImagesRequested) {
		initGame();
	}
}
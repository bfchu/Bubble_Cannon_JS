




var display = document.getElementById("gameCanvas");
var ctx = display.getContext("2d");


//COLORS
var ROYAL_BLUE = "hsla(243, 69%, 38%, 1)";

var projectiles = [];
var missileGravity = 0.16;

var terrain = [];
var terrainFallSpeed = .1;
var terrainMask = [];

var particles = [];
var particleSize = 5;
var particleGravity = .16;
var particleFade = 0.01385;
var minParticleSpeed = 1;
var maxParticleSpeed = 12;
var particlesPerBurst = 32;

var particleTestTimer = 2000;
var canSpawnParticlesTest = true;
var particleTestSource = new MObj(display.width/2, display.height/2, 0, 0, 32, ROYAL_BLUE);


//===========================================================================================


function MObj(x,y,deltaX,deltaY,size,color){
	this.xPos = x;
	this.yPos = y;
	this.deltaX = deltaX;
	this.deltaY = deltaY;
	this.size = size;
	this.color = color;

	this.updatePhysics = function() {
		this.xPos += this.deltaX;
		this.yPos += this.deltaY;
	}
	
	this.draw = function() {
		ctx.fillStyle = this.color;
		ctx.fillRect(this.xPos, this.yPos, this.size, this.size);
	}
	
	this.getRight = function() {
		return this.xPos + this.size;
	}
	
	this.getBottom = function() {
		return this.yPos + this.size;
	}
	
	this.isIntersecting = function(otherThing) {
		return !( (otherThing.xPos > this.getRight()) || (otherThing.getRight() < this.xPos) || (otherThing.yPos > this.getBottom()) || (otherThing.getBottom() < this.yPos) ); 
	}

}


function createExplosion(explodee, particleDensity) {
	var centerX = explodee.xPos + explodee.size / 2;
	var centerY = explodee.yPos + explodee.size / 2;

	if(particleDensity == null){
		var particleDensity = particlesPerBurst;
	}
				
	for (var i = 0; i < particleDensity; ++i) {
	
		var randomAngle = Math.random() * 2 * Math.PI;
		
		var speed = Math.random() * (maxParticleSpeed - minParticleSpeed) + minParticleSpeed;
	
		var velocityX = Math.cos(randomAngle) * speed;
		var velocityY = Math.sin(randomAngle) * speed;
				
		var particle = new MObj(centerX, centerY, velocityX, velocityY, particleSize, explodee.color);
		particle.alpha = 1;
		particles.push(particle);
	}
}

function updateParticles() {
	for (var i = particles.length - 1; i >= 0; --i) {
		particles[i].updatePhysics();
		
		// add some acceleration from gravity each frame.
		particles[i].deltaY += particleGravity;
		particles[i].alpha -= particleFade;

		particles[i].color = incrementAlpha(particles[i].color, particles[i].alpha);

		// remove particles that are no longer on screen.
		var shouldRemoveParticle = false;
	
		if (particles[i].xPos <= -particles[i].size) {
			shouldRemoveParticle = true;
		} else if (particles[i].xPos > display.width) {
			shouldRemoveParticle = true;
		} else if (particles[i].yPos <= -particles[i].size) {
			shouldRemoveParticle = true;
		} else if (particles[i].yPos > display.height) {
			shouldRemoveParticle = true;
		}
		
		if (shouldRemoveParticle) {
			particles.splice(i, 1);
		}	
	}
}

function incrementAlpha(hsLine, alpha){
	//take apart the HSLA string representing the color and change the alpha value to the given alpha. return the reconstructed string
	var newHsla = "";
	var values = hsLine.split("("); //clean off the elements of the string that are not he desired HSLA values
	values = values[1].split(")");
	var bits = values[0].split(",");

	bits[3] = alpha;

	newHsla = "hsla(" + bits[0] + ", " + bits[1] + ", " + bits[2] + ", " + bits[3] + ")";
	return newHsla;
}






//=======================================================================================
//GAME SETUP / START

(function buildTerrain(){
	for(var ii = 0; ii < display.height/3; ii += 4){
		for(var kk = 0; kk < display.width ; kk += 4 ){
			var grain = new MObj(display.width - kk - 4, display.height - ii - 4, 0,0, 4, "hsla(19, 63%, 28%, 1)");
			terrain.push(grain);
		}
	}

	//create a render mask for terrain.
	//keep track of hit locations and size of explosions, then remove that from the shape.
	terrainMask[terrainMask.length] = {x:0, y:display.height * (2/3)};
	terrainMask[terrainMask.length] = {x:display.width, y:display.height * (2/3)};
	terrainMask[terrainMask.length] = {x:display.width, y: display.height};
	terrainMask[terrainMask.length] = {x:0, y:display.height};


})();

(function update(){
	window.requestAnimationFrame(update, display);

	if (canSpawnParticlesTest){
		createExplosion(particleTestSource);
		canSpawnParticlesTest = false;
		window.setTimeout( function() { canSpawnParticlesTest = true; }, particleTestTimer);
	}

	updateParticles();

	drawFrame();
})();



//=======================================================================================
//RENDERING

function drawFrame(){
	clearDisplay();
	drawBackdrop();


	drawParticles();
	drawTerrain();

}

function drawBackdrop(){
	var grad = ctx.createLinearGradient(0,display.height/3,0,display.height);
	grad.addColorStop(0,"black");
	grad.addColorStop(1,"purple");

	ctx.fillStyle = grad;
	ctx.fillRect(0,0, display.width, display.height);

}

function drawParticles() {
	for (var i = 0; i < particles.length; ++i) {
		particles[i].draw();
	}
}

function drawTerrain() {
	ctx.beginPath();
	ctx.moveTo(terrainMask[0].x, terrainMask[0].y);
	for (var ii = 0; ii < terrainMask.length - 1; ++ii) {
		ctx.lineTo(terrainMask[ii+1].x, terrainMask[ii+1].y);
	};

	var grad = ctx.createLinearGradient(0,display.height,0,display.height/2);
	grad.addColorStop(0,"hsla(23, 60%, 22%, 1)");
	grad.addColorStop(1,"hsla(23, 60%, 47%, 1)");
	ctx.fillStyle = grad;

	ctx.fill();

}

//@citation: user: Prestaul at http://stackoverflow.com/questions/2142535/how-to-clear-the-canvas-for-redrawing
function clearDisplay(){
// Store the current transformation matrix
ctx.save();

// Use the identity matrix while clearing the canvas
ctx.setTransform(1, 0, 0, 1, 0, 0);
ctx.clearRect(0, 0, display.width, display.height);

// Restore the transform
ctx.restore();
}
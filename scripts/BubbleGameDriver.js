




var display = document.getElementById("gameCanvas");
var ctx = display.getContext("2d");


//COLORS
const ROYAL_BLUE = "hsla(243, 69%, 38%, 1)";
const RED = "hsla(0, 72%, 50%, 1)";
const DARK_BROWN = "hsla(23, 60%, 22%, 1)";
const BROWN = "hsla(23, 60%, 47%, 1)";

var playerHitBoxSize = 32;
var tankGravity = 0.2;
var p1 = new Tank((display.width/4), (display.height/2), 0,0, RED);
var p2 = new Tank((display.width * (3/4)), (display.height/2), 0,0, ROYAL_BLUE);



var projectiles = [];
var missileGravity = 0.16;

var terrain = [];
var terrainFallSpeed = .1;
var terrainMask = [];
var terrainChunkWidth = 4;

var particles = [];
var particleSize = 5;
var particleGravity = .16;
var particleFade = 0.01; //(1/72); //72 frames to disapear
var minParticleSpeed = 1;
var maxParticleSpeed = 12;
var particlesPerBurst = 32;

var particleTestTimer = 2000;
var canSpawnParticlesTest = true;
var particleTestSource = new MObj(display.width/2, display.height/2, 0, 0, playerHitBoxSize, playerHitBoxSize, ROYAL_BLUE);


//===========================================================================================


function MObj(x,y,deltaX,deltaY,sizeX,sizeY,color){
	this.xPos = x;
	this.yPos = y;
	this.deltaX = deltaX;
	this.deltaY = deltaY;
	this.sizeX = sizeX;
	this.sizeY = sizeY;
	this.color = color;

	this.updatePhysics = function() {
		this.xPos += this.deltaX;
		this.yPos += this.deltaY;
	}
	
	this.draw = function() {
		ctx.fillStyle = this.color;
		ctx.fillRect(this.xPos, this.yPos, this.sizeX, this.sizeY);
	}
	
	this.getRight = function() {
		return this.xPos + this.sizeX;
	}
	
	this.getBottom = function() {
		return this.yPos + this.sizeY;
	}
	
	this.isIntersecting = function(otherThing) {
		return !( (otherThing.xPos >= this.getRight()) || (otherThing.getRight() <= this.xPos) || (otherThing.yPos >= this.getBottom()) || (otherThing.getBottom() <= this.yPos) ); 
	}

	this.intersectsTerrain = function(){
		for(var ii = 0; ii < terrain.length; ++ii){
			if(this.isIntersecting(terrain[ii])){
				return true;
			}
		}
		return false;
	}
}


function Tank(x,y,deltaX,deltaY,color){
	var size = playerHitBoxSize;
	console.log("creating player Tank at x:" + x + ", y:" + y + " with size:" + size);
	this.solid = new MObj(x, y, deltaX, deltaY, size, size, color);
	this.currentGun = "single";
}


function createExplosion(explodee, particleDensity, bounce) {
	var centerX = explodee.xPos + explodee.sizeX / 2;
	var centerY = explodee.yPos + explodee.sizeY / 2;

	if(particleDensity == null){
		var particleDensity = particlesPerBurst;
	}
				
	for (var i = 0; i < particleDensity; ++i) {
	
		var randomAngle = Math.random() * 2 * Math.PI;
		
		var speed = Math.random() * (maxParticleSpeed - minParticleSpeed) + minParticleSpeed;
	
		var velocityX = Math.cos(randomAngle) * speed;
		var velocityY = Math.sin(randomAngle) * speed;
				
		var particle = new MObj(centerX, centerY, velocityX, velocityY, particleSize, particleSize, explodee.color);
		particle.alpha = 1;
		if(bounce != null){
			particle.bounce = true;
		}
		particles.push(particle);
	}
}



function incrementAlpha(hsLine, alpha){
	//take apart the HSLA string representing the color and change the alpha value to the given alpha. return the reconstructed string
	var newHsla = "";
	var values = hsLine.split("("); //clean off the elements of the string that are not the desired HSLA values
	values = values[1].split(")");
	var bits = values[0].split(",");

	bits[3] = alpha;

	newHsla = "hsla(" + bits[0] + ", " + bits[1] + ", " + bits[2] + ", " + bits[3] + ")";
	return newHsla;
}

//========================================================================================================================
//WORLD INITIALIZATION

(function buildTerrain(){


	for(var kk = 0; kk < display.width ; kk += terrainChunkWidth ){
		var grain = new MObj(display.width - kk - terrainChunkWidth, display.height - display.height/3, 0,0, terrainChunkWidth, display.height/3, BROWN);
		terrain.push(grain);
	}
	

	//create a render mask for terrain.
	//keep track of hit locations and size of explosions, then remove that from the shape.
	terrainMask[terrainMask.length] = {x:0, y:display.height * (2/3)};
	terrainMask[terrainMask.length] = {x:display.width, y:display.height * (2/3)};
	terrainMask[terrainMask.length] = {x:display.width, y: display.height};
	terrainMask[terrainMask.length] = {x:0, y:display.height};


})();



//=======================================================================================
//GAME SETUP / START


(function update(){
	window.requestAnimationFrame(update, display);

	updatePlayer(p1);
	updatePlayer(p2);

	if (canSpawnParticlesTest){
		createExplosion(particleTestSource);
		canSpawnParticlesTest = false;
		window.setTimeout( function() { canSpawnParticlesTest = true; }, particleTestTimer);
	}

	updateParticles();

	drawFrame();
})();



function updatePlayer(player){
	player.solid.updatePhysics();
	
	if(player.solid.intersectsTerrain()){
		player.solid.deltaY = 0;
		player.solid.deltaX = 0;
	} else{
		player.solid.deltaY += tankGravity;
	}

	//console.log("In updatePlayer: new position is x:" + player.solid.xPos + ", y:" + player.solid.yPos );

}







function updateParticles() {
	for (var i = particles.length - 1; i >= 0; --i) {
		particles[i].updatePhysics();
		
		// add some acceleration from gravity each frame.
		particles[i].deltaY += particleGravity;
		particles[i].alpha -= particleFade;

		particles[i].color = incrementAlpha(particles[i].color, particles[i].alpha);

		if(particles[i].bounce != null){
			if(particles[i].intersectsTerrain()){
				particles[i].deltaY = -particles[i].deltaY;
			}
		}

		// remove particles that are no longer on screen.
		var shouldRemoveParticle = false;
	
		if (particles[i].xPos <= -particles[i].sizeX) {
			shouldRemoveParticle = true;
		} else if (particles[i].xPos > display.width) {
			shouldRemoveParticle = true;
		} else if (particles[i].yPos <= -particles[i].sizeY) {
			shouldRemoveParticle = true;
		} else if (particles[i].yPos > display.height) {
			shouldRemoveParticle = true;
		}

		if(particles[i].alpha <= 0){
			shouldRemoveParticle = true;
		}
		
		if (shouldRemoveParticle) {
			particles.splice(i, 1);
		}	
	}
}

//=======================================================================================
//RENDERING

function drawFrame(){
	clearDisplay();
	drawBackdrop();

	p1.solid.draw();
	p2.solid.draw();

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
	grad.addColorStop(0,DARK_BROWN);
	grad.addColorStop(1,BROWN);
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
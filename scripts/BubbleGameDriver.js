




var display = document.getElementById("gameCanvas");
var ctx = display.getContext("2d");

var mousePosition = {x:0, y:0};
var mouseClick = false;

var stageWidth = display.width;
var stageHeight = display.height * (4/5);

//COLORS
const ROYAL_BLUE = "hsla(243, 69%, 38%, 1)";
const RED = "hsla(0, 72%, 50%, 1)";
const VIOLET = "hsla(279, 72%, 48%, 1)";
const SEAFOAM = "hsla(150, 77%, 50%, 1)";
const DARK_BROWN = "hsla(23, 60%, 22%, 1)";
const BROWN = "hsla(23, 60%, 47%, 1)";

var playerHitBoxSize = 32;
var tankGravity = 0.2;
var gunLength = 40;
var p1 = new Tank((display.width/4), (display.height/2), 0,0, RED);
var p2 = new Tank((display.width * (3/4)), (display.height/2), 0,0, VIOLET);


var projectiles = [];
var missileSize = 8;
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
var particlesPerBurst = 48;//32;

var particleTestTimer = 2400;
var canSpawnParticlesTest = true;

var lines = [];
var powerBar = {};

window.addEventListener("keydown", onKeyDown, false);
window.addEventListener("keyup", onKeyUp, false);
window.addEventListener("mousedown", onMouseDown, false);
window.addEventListener("mouseup", onMouseUp, false);
window.addEventListener("mousemove", onMouseMove, false);


var turnDelay = 100; //0 to 100 percent
var gameWaiting = false;
var gameState = 0;
var stateDefinitions = ["gameStart", "p1_Idle", "p1_Aim", "p1_Power", "p1_Fire", "p2_Idle", "p2_Aim", "p2_Power", "p2_Fire,"];
//var gameReady = false;

//buildGameStates();
buildTerrain();



//===========================================================================================
//CONSTRUCTORS

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

	this.isOffScreen = function(){
		if (this.xPos <= -this.sizeX) {
			return true;
		} else if (this.xPos > display.width) {
			return true;
		} else if (this.yPos <= -this.sizeY) {
			return true;
		} else if (this.yPos > display.height) {
			return true;
		}
		return false;
	}

	this.distanceTo = function(target){
		var center = {x: this.xPos + this.sizeX/2, y: this.yPos + this.sizeY/2};
		var distanceX = (target.xPos - center.x);
		var distanceY = (target.yPos - center.y);
		var magnitude = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

		return magnitude;
	}
}


function Tank(x,y,deltaX,deltaY,color){
	this.size = playerHitBoxSize;
	
	console.log("creating player Tank at x:" + x + ", y:" + y + " with size:" + this.size);
	
	this.solid = new MObj(x, y, deltaX, deltaY, this.size, this.size, color);
	this.score = 0;
	this.damage = 1;
	this.currentGun = "single";
	this.gunTip = {};
	this.angle = 0;
	this.power = 50;


	this.fire = function(){
		var deltaX = Math.cos(this.angle) * this.power/10;
		var deltaY = Math.sin(-this.angle) * this.power/10;
		var missile = new MObj(this.gunTip.x - missileSize/2, this.gunTip.y - missileSize/2, deltaX, deltaY, missileSize, missileSize, this.solid.color);
		missile.blastForce = 10;
		missile.blastRadius = 96;
		projectiles.push(missile);

		var waitTimeMS = Math.min(Math.abs(turnDelay * this.power/10), 1800);
		console.log("In Tank.fire(): waitTimeMS: " + waitTimeMS + "ms");
		gameWaiting = true;
		window.setTimeout( function() {gameWaiting = false;}, waitTimeMS);
	}

	this.impulse = function(proximity, force, source){ //force is a scalar, the source needs {xPos: , yPos: , blastRadius: }.
		//get component vectors and unit vector.
		//if( this.solid.xPos >= source.xPos){
			var distX = ( (this.solid.xPos + this.size/2) - (source.xPos + source.sizeX) );
		// }	else {
		// 	var distX = ( (source.xPos + source.sizeX) - (this.solid.xPos + this.size/2) );
		// }
		var distY = Math.abs( (this.solid.yPos + this.size/2) - (source.yPos + source.sizeY) );
		var magnitude = Math.sqrt(distX*distX + distY*distY);
		var unitV = {x: distX/magnitude, y: distY/magnitude};
		var forceV = {x: unitV.x * force, y: unitV.y * force};

		//reduce vector based on distance.
		if(proximity > 0 &&
			proximity <= source.blastRadius){
			forceV.x -= forceV.x * (proximity/source.blastRadius); // multiply forceV by the percentage of the blastRadius that proximity is.
			forceV.y -= forceV.y * (proximity/source.blastRadius); 
		}

		//increase vectors based on Tank's impulse resistance.

		forceV.x *= this.damage/250;


		//apply acceleration based on tank's current distance from the ground.
		this.solid.deltaX += forceV.x;
		if(forceV.y > 0){
			this.solid.deltaY -= forceV.y;
		} else{
			this.solid.deltaY += forceV.y;
		}

		console.log("in Tank.impulse(): forceX: " + forceV.x + ", forceY: " + forceV.y);
	}

	this.lose = function(){
		//canSpawnParticlesTest = true;
	}
}



//=========================================================================================
//

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
			if(bounce){
				particle.bounce = true;
			}
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

// function buildGameStates(){
// 	var onStart = new State("onStart");
// 	onStart.onEnter(buildTerrain);
// 	onStart.onUpdate(setGameReady);

// 	var p1_Idle = new State("p1_Idle");
// 	p1_Idle.onEnter(setGUI);


// 	addTransition("toPlayer1Turn", onStart, p1_Idle, gameReady);

// 	gameState.currentState = null;
// 	gameState.initialState = onStart;


// }

// function setGameReady(){
// 	gameReady = true;
// }

function buildTerrain(){


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


}

function setGUI(player){


}

//=======================================================================================
//Event Handlers

function onMouseMove(event) {
	mousePosition = { x : event.pageX, y : event.pageY };
}

function onMouseDown(event) {
	mouseClick = true;
}

function onMouseUp(event) {
	mouseClick = false;
}

function onKeyDown(event){

}

function onKeyUp(event){

}

//=======================================================================================
//GAME SETUP / START


(function update(){
	window.requestAnimationFrame(update, display);

	//Check if State:
	switch(gameState){
		case 0: //gameStart
			//buildTerrain();
			gameState = 1;
			break;
		case 1: //	p1_Idle
			if(mouseClick && !gameWaiting){
				gameState = 2;
			}
			break;
		case 2: //  p1_Aim
			aimMode(p1);
			if(!mouseClick){
				gameState = 4;
			}
			break;
		case 3: //  p1_Power

			break;
		case 4: //  p1_Fire
			p1.fire();
			gameState = 5;
			break;
		case 5: //  p2_Idle
			if(mouseClick && !gameWaiting){
				gameState = 6;
			}
			break;
		case 6: //  p2_Aim
			aimMode(p2);
			if(!mouseClick){
				gameState = 8;
			}
			break;
		case 7: //  p2_Power

			break;
		case 8: //  p2_Fire
			p2.fire();
			gameState = 1;
			break;
		default:
			break;
	}


	//TESTS:
	if (canSpawnParticlesTest){
		var particleTestSource = new MObj(display.width/utils.getRandomInt(1,8), display.height/utils.getRandomInt(2,8), 0, 0, playerHitBoxSize, playerHitBoxSize, SEAFOAM);
		createExplosion(particleTestSource);
		canSpawnParticlesTest = false;
		window.setTimeout( function() { canSpawnParticlesTest = true; }, particleTestTimer);
	}

	//Always do these steps:
	updatePlayer(p1);
	updatePlayer(p2);
	updateProjectiles();
	updateParticles();

	drawFrame();
})();


function aimMode(player){
	var center = {x: player.solid.xPos + player.size/2, y: player.solid.yPos + player.size/2 };
	var distanceX = (mousePosition.x - center.x);
	var distanceY = (mousePosition.y - center.y);
	var magnitude = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
	var mouseAngle = -Math.atan2(distanceY, distanceX);

	var unitV = {x: distanceX/magnitude, y: distanceY/magnitude};
	var lineStart = {x: center.x + unitV.x * gunLength, y: center.y + unitV.y * gunLength};
		
	lines[lines.length] = lineStart;
	lines[lines.length] = mousePosition;

	powerBar = {x: magnitude * (3/4), y: 40};

	player.gunTip = lineStart;
	player.angle = mouseAngle;
	player.power = Math.floor(magnitude/4);

}


function updatePlayer(player){
	player.solid.updatePhysics();
	
	if(player.solid.intersectsTerrain()){
		player.solid.deltaY = 0;
		player.solid.deltaX = 0;
	} else{
		player.solid.deltaY += tankGravity;
	}

	// if(player.solid.isOffScreen){
	// 	console.log("In updatePlayer():  player isOffScreen" );
	// 	player.lose();
	// }

}


function updateProjectiles() {
	//TODO: firing shots is crashing
	for (var i = projectiles.length - 1; i >= 0; --i) {
		projectiles[i].updatePhysics();
		projectiles[i].deltaY += missileGravity;

		if( projectiles[i].intersectsTerrain() || 
			projectiles[i].isIntersecting(p1.solid) || 
			projectiles[i].isIntersecting(p2.solid)  ){

			single_explode(projectiles[i]);
			projectiles.splice(i,1);
		} else if(projectiles[i].isOffScreen()){
			projectiles.splice(i,1);
		}

	}

}

function single_explode(shot){ //single is the shot type.


	if(shot.isIntersecting(p1.solid)){
		p2.score += 100;
		p1.damage += 100;
		p1.impulse(0, shot.blastForce, shot);
		//TODO: create physics interaction;
	} 
	if(shot.isIntersecting(p2.solid)){
		p1.score += 100;
		p2.damage += 100;
		p2.impulse(0, shot.blastForce, shot);
		//TODO: create physics interation;
	}

	if(shot.intersectsTerrain()){
		//TODO: measure distance from the explosion to the nearest tank(s) and deal score damage and physics appropriately.
		var distance_p1 = shot.distanceTo(p1.solid);
		var distance_p2 = shot.distanceTo(p2.solid);

		if(distance_p1 <= shot.blastRadius){
			p1.impulse(distance_p1, shot.blastForce, shot);
		}
		if(distance_p2 <= shot.blastRadius){
			p2.impulse(distance_p2, shot.blastForce, shot);
		}
	}

	createExplosion(shot, particlesPerBurst, utils.getRandomBool());
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
		var shouldRemoveParticle = particles[i].isOffScreen();

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

	drawProjectiles();
	drawParticles();
	drawTerrain();
	drawGUI();
}



function drawBackdrop(){
	var grad = ctx.createLinearGradient(0,display.height/3,0,display.height);
	grad.addColorStop(0,"black");
	grad.addColorStop(1,"purple");

	ctx.fillStyle = grad;
	ctx.fillRect(0,0, display.width, display.height);

}



function drawGUI(){

	//ctx.fillRect(); //Fire button


	ctx.fillStyle = "#FFFFFF";

	ctx.fillText("FIRE!", display.width/2, display.height * (7/8));
	ctx.fillText("Player 1: " + p1.score, 32, 32);
	ctx.fillText("Player 2: " + p2.score, display.width - 150, 32);
	ctx.fillText("ANGLE: " + Math.floor(utils.toDegrees(p1.angle)), display.width/3, display.height * (7/8) - 16 );
	ctx.fillText("POWER: " + p1.power, display.width/3, display.height * (7/8) + 16 );
	ctx.fillText("ANGLE: " + Math.floor(utils.toDegrees(p2.angle)), display.width *(2/3) - 24, display.height * (7/8) - 16 );
	ctx.fillText("POWER: " + p2.power, display.width *(2/3) - 24, display.height * (7/8) + 16 );

	//Draw angle indicator lines
	for(var ii = 0; ii < lines.length; ii+=2){
		ctx.strokeStyle = "#FFFFFF";
		ctx.moveTo(lines[ii].x, lines[ii].y);
		ctx.lineTo(lines[ii+1].x, lines[ii+1].y);
		ctx.stroke();
	}
	lines.splice(0,lines.length); //clear the array without wasting more memory.

	//Draw Power indicator bar

	if(powerBar != null){
		ctx.fillStyle = SEAFOAM;
		ctx.fillRect(display.width * (2/5), display.height *(3/4), powerBar.x, powerBar.y);
		powerBar = null;
	}
}



function drawParticles() {
	for (var i = 0; i < particles.length; ++i) {
		particles[i].draw();
	}
}


function drawProjectiles() {
	for (var i = 0; i < projectiles.length; ++i) {
		projectiles[i].draw();
	}
}


function drawTerrain() {
	var grad = ctx.createLinearGradient(0,display.height,0,display.height/2);
	grad.addColorStop(0,DARK_BROWN);
	grad.addColorStop(1,BROWN);
	ctx.fillStyle = grad;

	ctx.beginPath();
	ctx.moveTo(terrainMask[0].x, terrainMask[0].y);
	for (var ii = 0; ii < terrainMask.length - 1; ++ii) {
		ctx.lineTo(terrainMask[ii+1].x, terrainMask[ii+1].y);
	};

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
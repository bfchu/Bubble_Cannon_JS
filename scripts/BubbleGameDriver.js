




var display = document.getElementById("gameCanvas");
var ctx = display.getContext("2d");

var mousePosition = {x:0, y:0};
var mouseClick = false;

var stageWidth = display.width;
var stageHeight = display.height * (4/5);

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
var particlesPerBurst = 32;

var particleTestTimer = 2000;
var canSpawnParticlesTest = true;
var particleTestSource = new MObj(display.width/2, display.height/2, 0, 0, playerHitBoxSize, playerHitBoxSize, ROYAL_BLUE);

window.addEventListener("keydown", onKeyDown, false);
window.addEventListener("keyup", onKeyUp, false);
window.addEventListener("mousedown", onMouseDown, false);
window.addEventListener("mouseup", onMouseUp, false);
window.addEventListener("mousemove", onMouseMove, false);


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
}


function Tank(x,y,deltaX,deltaY,color){
	this.size = playerHitBoxSize;
	
	console.log("creating player Tank at x:" + x + ", y:" + y + " with size:" + this.size);
	
	this.solid = new MObj(x, y, deltaX, deltaY, this.size, this.size, color);
	this.score = 0;
	this.currentGun = "single";
	this.angle = 0;
	this.power = 50;


	this.fire = function(){
		var originX = this.xPos + this.size/2;
		var originY = this.yPos - this.size/2;
		var deltaX = Math.cos(this.angle) * this.power/10;
		var deltaY = Math.sin(this.angle) * this.power/10;
		var missile = new MObj(originX, originY, deltaX, deltaY, missileSize, missileSize, this.color);
		projectiles.push(missile);
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
			if(mouseClick){
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
		createExplosion(particleTestSource, particlesPerBurst, true);
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
	//TODO: fix NaN getting passed into ANGLE nad POWER.
	var center = {x: player.xPos + player.size/2, y: player.yPos + player.size/2 };
	var distanceX = Math.abs(mousePosition.x - center.x);
	var distanceY = Math.abs(mousePosition.y - center.y);
	var magnitude = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
	var mouseAngle = Math.atan(distanceY/distanceX);
		

	ctx.fillStyle = "#FFFFFF";
	ctx.moveTo(center.x, center.y);
	ctx.lineTo(mousePosition.x, mousePosition.y);
	ctx.stroke();

	player.angle = mouseAngle;
	player.power = magnitude;
}


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


function updateProjectiles() {
	for (var i = projectiles.length - 1; i >= 0; --i) {
		projectiles[i].updatePhysics();
		projectiles[i].deltaY += missileGravity;

		if( projectiles[i].intersectsTerrain || 
			projectiles[i].isIntersecting(p1.solid) || 
			projectiles[i].isIntersecting(p2.solid)  ){

			single_explode(projectiles[i]);
			projectiles.splice(projectiles[i]);
		}

	}

}

function single_explode(shot){


	if(shot.isIntersecting(p1.solid)){
		p2.score += 100;
		//TODO: create physics interaction;
	} 
	if(shot.isIntersecting(p2.solid)){
		p1.score += 100;
		//TODO: create physics interation;
	}

	if(shot.intersectsTerrain){
		//TODO: measure distance from the explosion to the nearest tank(s) and deal score damage and physics appropriately.
	}

	createExplosion(shot);
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
	ctx.fillStyle = "#FFFFFF";

	ctx.fillText("Player 1: " + p1.score, 32, 32);
	ctx.fillText("Player 2: " + p2.score, display.width - 150, 32);
	ctx.fillText("ANGLE: " + p1.angle, display.width/3, display.height * (7/8) - 16 );
	ctx.fillText("POWER: " + p1.power, display.width/3, display.height * (7/8) + 16 );
	ctx.fillText("ANGLE: " + p2.angle, display.width *(2/3) - 24, display.height * (7/8) - 16 );
	ctx.fillText("POWER: " + p2.power, display.width *(2/3) - 24, display.height * (7/8) + 16 );
	ctx.fillText("FIRE!", display.width/2, display.height * (7/8));

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
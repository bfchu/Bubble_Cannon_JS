/*//////////////////////////////////////////////////////
//	Bubble Cannon JS
//
//	Brian Chu
//	CS74.42A Game Programming in Javascript
//  James Stewart
//  Fall 2013
//
//
//	TODO:
	- add disc explosion effects to tank shots
	- add screen shake when tank shots explode, and when a tank goes off screen
	- add graphical effects to the tank explosion
	- add sound effects to everything:
		-BGM
	- complete score and damage calculations for proximal blasts
	- make tanks more 'blob-like'
	- give tanks cute faces ^-^
	- make terrain more interesting with 'fractal lines'
	- make the game display damage numbers
	-
//
*/

var display = document.getElementById("gameCanvas");
var ctx = display.getContext("2d");

var mousePosition = {x:0, y:0};
var mouseClick = false;

var stageWidth = display.width;
var stageHeight = display.height * (4/5);


//AUDIO
var numExplosionSFXs = 4;
var sfx = [];
sfx[0] = new Howl({urls: ["audio/explosion_single01.mp3", "audio/explosion_single01.mp3"], volume: 0.5});
sfx[1] = new Howl({urls: ["audio/explosion_single02.mp3", "audio/explosion_single02.mp3"], volume: 0.5});
sfx[2] = new Howl({urls: ["audio/explosion_single03.mp3", "audio/explosion_single03.mp3"], volume: 0.5});
sfx[3] = new Howl({urls: ["audio/explosion_single04.mp3", "audio/explosion_single04.mp3"], volume: 0.5});
sfx[4] = new Howl({urls: ["audio/explosion_big.mp3", "audio/explosion_big.mp3"], volume: 0.5});
sfx[5] = new Howl({urls: ["audio/bump.mp3", "audio/bump.mp3"], volume: 0.5});
sfx[6] = new Howl({urls: ["audio/shot.mp3", "audio/shot.mp3"], volume: 0.5});
sfx[7] = new Howl({urls: ["audio/fireworks01.mp3", "audio/fireworks01.mp3"], volume: 0.5});
sfx[8] = new Howl({urls: ["audio/fireworks02.mp3", "audio/fireworks02.mp3"], volume: 0.5});
sfx[9] = new Howl({urls: ["audio/fireworks03.mp3", "audio/fireworks03.mp3"], volume: 0.5});



//COLORS
const ROYAL_BLUE = "hsla(243, 69%, 38%, 1)";
const RED = "hsla(0, 72%, 50%, 1)";
const VIOLET = "hsla(279, 72%, 48%, 1)";
const GOLDEN_YELLOW = "hsla(55, 91%, 50%, 1)";
const SEAFOAM = "hsla(150, 77%, 50%, 1)";
const DARK_BROWN = "hsla(23, 60%, 22%, 1)";
const BROWN = "hsla(23, 60%, 47%, 1)";

var playerHitBoxSize = 32;
var tankGravity = 0.2;
var gunLength = 40;
var p1 = new Tank((display.width/4), (display.height/4), 0,0, RED);
var p2 = new Tank((display.width * (3/4)), (display.height/4), 0,0, VIOLET);


var projectiles = [];
var missileSize = 8;
var missileGravity = 0.16;

var terrain = [];
var terrainFallSpeed = .1;
var fractalPoints = []; // fractalPoints.length will be two larger tan terrainComplexity.
var terrainMask = [];
var terrainChunkWidth = 4;
var terrainComplexity = 6;

var particles = [];
var particleSize = 5;
var particleGravity = .16;
var particleFade = 0.01; //(1/72); //72 frames to disapear
var minParticleSpeed = 1;
var maxParticleSpeed = 12;
var particlesPerBurst = 48;//32;
var particleTestTimer = 1200;

var canSpawnParticlesTest = false;

var damageText = [];
var textFade = 0.01;
var damageColor = SEAFOAM;

var discs = [];
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
var stateDefinitions = ["gameStart", "p1_Idle", "p1_Aim", "p1_Power", "p1_Fire", "p2_Idle", "p2_Aim", "p2_Power", "p2_Fire,", "gameOver"];
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
		return !( (otherThing.xPos >= this.getRight()) ||
				  (otherThing.getRight() <= this.xPos) || 
				  (otherThing.yPos >= this.getBottom()) || 
				  (otherThing.getBottom() <= this.yPos) ); 
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
	this.isAlive = true;
	this.isSeated = false;
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
		missile.sfx = getRandomSFX(0, numExplosionSFXs - 1);
		projectiles.push(missile);

		sfx[6].play();

		var waitTimeMS = Math.min(Math.abs(turnDelay * this.power/10), 1800);
		console.log("In Tank.fire(): waitTimeMS: " + waitTimeMS + "ms");
		gameWaiting = true;
		window.setTimeout( function() {gameWaiting = false;}, waitTimeMS);
	}

	this.reSeat = function(){
		for(var ii = 0; ii < terrain.length; ++ii){
			if(this.solid.isIntersecting(terrain[ii])){
				var overlap = this.solid.getBottom() - terrain[ii].yPos;
				this.solid.yPos -= overlap;
			}
		}
		this.isSeated = true;
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
		this.isSeated = false;
		this.solid.deltaX += forceV.x;
		if(forceV.y > 0){
			this.solid.deltaY -= forceV.y;
		} else{
			this.solid.deltaY += forceV.y;
		}

		console.log("in Tank.impulse(): forceX: " + forceV.x + ", forceY: " + forceV.y);
	}

	this.explode = function(){
		//createExplosion(this, 200, true);
		this.isAlive = false;
		sfx[4].play();

		this.solid.xPos = null;
		this.solid.yPos = null;

		this.lose();
	}

	this.lose = function(){
		canSpawnParticlesTest = true;
		gameState = 9;
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

function addDamageText(damage, xPos, yPos){
	console.log("in addDamageText(): damage:"  + damage + ", position: x" + xPos + ",y" + yPos);
	var dmgTxt = new MObj(xPos, yPos, 0, -0.5, 0, 0, damageColor);
	dmgTxt.text = damage;
	dmgTxt.alpha = 1.0;
	damageText.push(dmgTxt);
}

function setAlpha(hsLine, alpha){
	//take apart the HSLA string representing the color and change the alpha value to the given alpha. return the reconstructed string
	var newHsla = "";
	var values = hsLine.split("("); //clean off the elements of the string that are not the desired HSLA values
	values = values[1].split(")");
	var bits = values[0].split(",");

	bits[3] = alpha;

	newHsla = "hsla(" + bits[0] + ", " + bits[1] + ", " + bits[2] + ", " + bits[3] + ")";
	return newHsla;
}


function getRandomSFX(min, max){
	return sfx[utils.getRandomInt(min,max)];
}

//========================================================================================================================
//WORLD INITIALIZATION

function buildTerrain(){
	fractalPoints[0] = {x:0, y:display.height * (2/3)}; //start point
	//TODO: fix bug where the last point sometimes goes off the edge of the screen.
	for(var ii = 0; ii < terrainComplexity; ++ii){
		fractalPoints[ii+1] = {x: fractalPoints[ii].x + utils.getRandomInt(display.width/10, display.width/terrainComplexity), 
							 y: fractalPoints[ii].y + utils.getRandomInt(-terrainComplexity, terrainComplexity) * 16};
	}
	fractalPoints[fractalPoints.length] = {x:display.width, y:display.height * (2/3)}; //end point

	for(var kk = 0; kk < display.width - terrainChunkWidth; kk += terrainChunkWidth ){
		var xPos = kk - terrainChunkWidth;

		for(var ii = 0; ii < fractalPoints.length-1; ++ii){
			if(fractalPoints[ii+1].x > xPos + terrainChunkWidth){
				var slope = (fractalPoints[ii].y - fractalPoints[ii+1].y)/(fractalPoints[ii+1].x - fractalPoints[ii].x);
				var leftIntercept = fractalPoints[ii].y + fractalPoints[ii].x * slope;
				var sizeY = display.height - Math.max(leftIntercept - xPos * slope, 0);
				break;
			}
		}
		var yPos =  display.height - sizeY;

		var grain = new MObj(xPos, yPos, 0, 0, terrainChunkWidth, sizeY, BROWN);
		terrain.push(grain);
	}
	

	//create a render mask for terrain.
	//TODO: make the render mask of the terrain reflect the 'sticks' that are the back end.
	terrainMask[0] = {x:display.width, y: display.height};
	terrainMask[1] = {x:0, y:display.height};

	for(var ii = 0; ii < fractalPoints.length; ++ii){
		terrainMask[ii + 2] = fractalPoints[ii];
	}


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
		case 9:
		default:
			//gameOver stuff;
			break;
	}


	//TESTS:
	if (canSpawnParticlesTest){
		var particleTestSource = new MObj(display.width/2 + utils.getRandomInt(-display.width/2, display.width/2),
										 display.height * 1/utils.getRandomInt(2,8), 
										 0, 0, playerHitBoxSize, playerHitBoxSize, SEAFOAM);
		getRandomSFX(7,9).play();
		createExplosion(particleTestSource);
		canSpawnParticlesTest = false;
		window.setTimeout( function() { canSpawnParticlesTest = true; }, utils.getRandomInt(100, particleTestTimer));
	}

	//Always do these steps:
	updatePlayer(p1);
	updatePlayer(p2);
	updateProjectiles();
	updateParticles();
	updateDamageText();

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


function single_explode(shot){ //single is the shot type.
	if(shot.isIntersecting(p1.solid)){
		p2.score += 100;
		p1.damage += 100;
		p1.impulse(0, shot.blastForce, shot);
		addDamageText(100, p1.solid.xPos, p1.solid.yPos);
	} 
	if(shot.isIntersecting(p2.solid)){
		p1.score += 100;
		p2.damage += 100;
		p2.impulse(0, shot.blastForce, shot);
		addDamageText(100, p2.solid.xPos, p2.solid.yPos);
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
	shot.sfx.play();
	createExplosion(shot, particlesPerBurst, utils.getRandomBool());
}


function updatePlayer(player){
	player.solid.updatePhysics();
	
	if(player.solid.intersectsTerrain() && !player.isSeated){
		player.reSeat();
		sfx[5].play();
		player.solid.deltaY = 0;
		player.solid.deltaX = 0;
	} else if(!player.isSeated){
		player.solid.deltaY += tankGravity;
	}

	if(player.solid.isOffScreen()){
		player.solid.deltaY = 0;
		player.solid.deltaX = 0;
		player.explode();
	}

}


function updateProjectiles() {
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



function updateParticles() {
	for (var i = particles.length - 1; i >= 0; --i) {
		particles[i].updatePhysics();
		
		// add some acceleration from gravity each frame.
		particles[i].deltaY += particleGravity;
		particles[i].alpha -= particleFade;

		particles[i].color = setAlpha(particles[i].color, particles[i].alpha);

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



function updateDamageText(){
	for (var ii = damageText.length - 1; ii >= 0; --ii) {
		damageText[ii].updatePhysics();

		damageText[ii].alpha -= textFade;
		setAlpha(damageText[ii].color, damageText[ii].alpha);

		if (damageText[ii].yPos < 0 || damageText[ii].alpha <= 0) {
			damageText.splice(ii, 1);
		}
	}
}

//=======================================================================================
//RENDERING

function drawFrame(){
	clearDisplay();
	drawBackdrop();

	//TODO: draw player tanks as 'jelly' blobs.
	if(p1.isAlive){
		p1.solid.draw();
	}
	if(p2.isAlive){
		p2.solid.draw();
	}

	drawProjectiles();
	drawParticles();
	drawTerrain();
	drawGUI();
	drawDamageTexts();
}



function drawBackdrop(){
	var grad = ctx.createLinearGradient(0,display.height/3,0,display.height);
	grad.addColorStop(0,"black");
	grad.addColorStop(1,"purple");

	ctx.fillStyle = grad;
	ctx.fillRect(0,0, display.width, display.height);

}



function drawGUI(){

	//TODO: ctx.fillRect(); // Fire button


	ctx.fillStyle = "#FFFFFF";
	ctx.font = "16px Arial";
	//ctx.fillText("FIRE!", display.width/2 - 32, display.height * (7/8));
	ctx.fillText("Player 1: " + p1.score, 32, 32);
	ctx.fillText("Player 2: " + p2.score, display.width - 150, 32);
	ctx.fillText("ANGLE: " + Math.floor(utils.toDegrees(p1.angle)), display.width/3 - 32, display.height * (7/8) - 16 );
	ctx.fillText("POWER: " + p1.power, display.width/3 - 32, display.height * (7/8) + 16 );
	ctx.fillText("ANGLE: " + Math.floor(utils.toDegrees(p2.angle)), display.width *(2/3) - 56, display.height * (7/8) - 16 );
	ctx.fillText("POWER: " + p2.power, display.width *(2/3) - 56, display.height * (7/8) + 16 );

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
		var grad = ctx.createLinearGradient(display.width * (2/7), 0, display.width * (5/7), 0);
		grad.addColorStop(0, SEAFOAM);
		grad.addColorStop(1, GOLDEN_YELLOW);
		ctx.fillStyle = grad;
		ctx.fillRect(display.width * (2/7), display.height *(3/4), powerBar.x, powerBar.y);
		powerBar = null;
	}

	if(gameState == 9){
		ctx.font = "80px Arial";
		if(p1.isAlive){
			ctx.fillStyle = p1.solid.color;
			var text = "PLAYER 1 WINS!"
			var textSize = ctx.measureText(text);
			ctx.fillText(text, display.width/2 - textSize.width/2, display.height/2);
		} else {
			ctx.fillStyle = p2.solid.color;
			var text = "PLAYER 2 WINS!"
			var textSize = ctx.measureText(text);
			ctx.fillText(text, display.width/2 - textSize.width/2, display.height/2);
		}

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

function drawDamageTexts() {
	for (var ii = 0; ii < damageText.length; ++ii) {
		var text = String(damageText[ii].text);
		var textSize = ctx.measureText(text);
		console.log("in drawDamageTexts(): text: " + text + ", size:" + textSize.width);
		ctx.fillStyle = damageText[ii].color;
		ctx.fillText(text, damageText[ii].xPos - textSize.width/2, damageText[ii].yPos + 24);
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
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
	- add a sort of tense 'flinch' vibration when a tank gets hit, then they fly away with impulse.
	- make player's current damage numbers flash, inflate, change color when they take damage.
	- add graphical effects to the tank explosion.
	- add sound effects to everything:
		-BGM still needs to loop properly
	- make tanks more 'blob-like'
		- give tanks cute faces ^-^
		- make tank's eyes look in the direction their gun is pointing.
	- GUI controls:
		- music, sfx on-off button
		- angle, power +/- buttons
		- Fire button.

	BUGS:
	- music not correctly looping.
	- terrain craters sometimes form little spikes or sharp dips in the middle.
	- terrain sometimes generates with a lethal drop under player 2.
	- bullet tunneling
	- after being hit, players sometimes slide through terrain/air, ignoring gravity until they are re-seated by function call.

	FEATURES:
	- Supports two players.
	- Can be played using only the mouse.
	- music and sfx.
	- audio can be muted/unmuter by pressing space bar.
	- particle effects from explosions.
	- particles interact with terrain physics sometimes.
	- explosions throw around the player tanks with 'physics.' (simple force vectors found using directional unit vectors, not yet accounting for normal force)
	- explosions from 'tank rounds' calculate damage and physics based on proximity to players.
	- player's resistence to force (mass) is reduced the more damage they have taken.
	- terrain is destructible.
	- terrain is randomly generated at game start using simple fractal line plotting.
	- displays both player's current/most recent shot's angle and power, and indicated who's turn it is.
	- vector graphics!
	- color gradients!
	- 
//
*/

var display = document.getElementById("gameCanvas");
var ctx = display.getContext("2d");

var mousePosition = {x:0, y:0};
var mouseClick = false;

var stageWidth = display.width;
var stageHeight = display.height * (4/5);

//TEXTURES:
// audio icon from: https://www.iconfinder.com/icons/87527/audio_medium_panel_volume_icon
// made by Frank Souza.
loadImage("audio");

//AUDIO
var numExplosionSFXs = 4;
var sfx = [];
sfx[0] = new Howl({urls: ["audio/explosion_single01.mp3", "audio/explosion_single01.wav"], volume: 0.5});
sfx[1] = new Howl({urls: ["audio/explosion_single02.mp3", "audio/explosion_single02.wav"], volume: 0.5});
sfx[2] = new Howl({urls: ["audio/explosion_single03.mp3", "audio/explosion_single03.wav"], volume: 0.5});
sfx[3] = new Howl({urls: ["audio/explosion_single04.mp3", "audio/explosion_single04.wav"], volume: 0.5});
sfx[4] = new Howl({urls: ["audio/explosion_big.mp3", "audio/explosion_big.wav"], volume: 0.5});
sfx[5] = new Howl({urls: ["audio/bump.mp3", "audio/bump.wav"], volume: 0.5});
sfx[6] = new Howl({urls: ["audio/shot.mp3", "audio/shot.wav"], volume: 0.5});
sfx[7] = new Howl({urls: ["audio/fireworks01.mp3", "audio/fireworks01.wav"], volume: 0.5});
sfx[8] = new Howl({urls: ["audio/fireworks02.mp3", "audio/fireworks02.wav"], volume: 0.5});
sfx[9] = new Howl({urls: ["audio/fireworks03.mp3", "audio/fireworks03.wav"], volume: 0.5});
sfx[10] = new Howl({urls: ["audio/artillery_jazz.mp3", "audio/artillery_jazz.wav"], volume: 0.5, loop:false, 
					onend: function(){ this.play(); this.pos(27.857);} });


//COLORS
const GREEN = "hsla(97, 61%, 44%, 1)";
const DARK_GREEN = "hsla(97, 82%, 20%, 1)";
const LEAF = "hsla(79, 56%, 45%, 1)";
const OLIVE = "hsla(88, 82%, 20%, 1)";
const LIME = "hsla(117, 100%, 50%, 1)";
const LIME_50 = "hsla(117, 100%, 50%, .5)";
const LIME_25 = "hsla(117, 100%, 50%, .25)";
const ROYAL_BLUE = "hsla(243, 69%, 38%, 1)";
const RED = "hsla(0, 72%, 50%, 1)";
const VIOLET = "hsla(279, 72%, 48%, 1)";
const GOLDEN_YELLOW = "hsla(55, 91%, 50%, 1)";
const SEAFOAM = "hsla(150, 77%, 50%, 1)";
const DARKER_BROWN = "hsla(23, 51%, 12%, 1)";
const DARK_BROWN = "hsla(23, 60%, 22%, 1)";
const BROWN = "hsla(23, 60%, 47%, 1)";

var playerHitBoxSize = 24; //32
var missileSize = 8;
var gunLength = playerHitBoxSize + missileSize + 2;

var tankGravity = 0.2;
var p1 = new Tank((display.width/4), (display.height/4), 0,0, RED);
var p2 = new Tank((display.width * (3/4)), (display.height/4), 0,0, VIOLET);
var p1_nums_x = display.width/3 - 32;
var p1_nums_y = display.height * (1/8);
var p2_nums_x = display.width *(2/3) - 56;
var p2_nums_y = display.height * (1/8);


var projectiles = [];
var missileGravity = 0.16;

var terrain = [];
var terrainFallSpeed = .1;
var fractalPoints = []; // fractalPoints.length will be two larger than terrainComplexity.
var terrainMask = [];
var terrainChunkWidth = 4; //4;
var terrainComplexity = 6;
var displayChunks = true;
var craterChunkwidth = 2;
var craterDepth = 1/2;
var terrainSoftness = 1/4;

var particles = [];
var particleSize = 5;
var particleGravity = .16;
var particleFade = 0.01; //(1/72); //72 frames to disapear
var minParticleSpeed = 1;
var maxParticleSpeed = 12;
var particlesPerBurst = 56;//48;//32;
var particleTestTimer = 1200;

var canSpawnParticlesTest = false;

var explosions = [];
var visibleBlastRatio = 3/5;

var damageText = [];
var textFade = 0.005;
var damageColor = SEAFOAM;
var directHitVal = 100;
var tankMass = 250; 

var discs = [];
var lines = [];
var powerBar = {};

window.addEventListener("keydown", onKeyDown, false);
window.addEventListener("keyup", onKeyUp, false);
window.addEventListener("mousedown", onMouseDown, false);
window.addEventListener("mouseup", onMouseUp, false);
window.addEventListener("mousemove", onMouseMove, false);


var turnDelay = 100;
var maxTurnDelay = 1800;
var gameWaiting = false;
var gameState = 0;
var audioOn = true;
//var stateDefinitions = ["gameStart", "p1_Idle", "p1_Aim", "p1_Power", "p1_Fire", "p2_Idle", "p2_Aim", "p2_Power", "p2_Fire,", "gameOver"];
//var gameReady = false;

//buildGameStates();

buildTerrain();

//var bgmLoopTime = 96000; // - 27857.142;
(function startMusicLoop(){
	sfx[10].play();
	window.setTimeout(function(){console.log("music pos:"+ sfx[10].pos());},27857); //check the music's positon at the point it is supposed to loop
})();


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
		return getDistance(this, target);
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

		var waitTimeMS = Math.min(Math.abs(turnDelay * this.power/10), maxTurnDelay);
		console.log("In Tank.fire(): waitTimeMS: " + waitTimeMS + "ms");
		gameWaiting = true;
		window.setTimeout( function() {gameWaiting = false;}, waitTimeMS);
	}

	this.reSeat = function(){
		var airborne = true;
		for(var ii = 0; ii < terrain.length; ++ii){
			if(this.solid.isIntersecting(terrain[ii])){
				var overlap = this.solid.getBottom() - terrain[ii].yPos;
				this.solid.yPos -= overlap;
				var airborne = false;
			}
		}
		if(airborne){
			this.isSeated = false;
			this.deltaY -= 0.001;
		} else { 
			this.isSeated = true;
		}
	}

	this.impulse = function(source){
		//get component vectors and unit vector.
		this.center = {x:(this.solid.xPos + this.size/2), y: (this.solid.yPos + this.size/2)};
		source.center = {x: (source.xPos + source.sizeX/2), y: (source.yPos + source.sizeY/2)};
		var distX = (this.center.x - source.center.x);
		var distY = Math.abs( this.center.y - source.center.y );
		var magnitude = Math.sqrt(distX*distX + distY*distY);
		var unitV = {x: distX/magnitude, y: distY/magnitude};
		var proximity = magnitude - playerHitBoxSize;
		var ratio = (source.blastRadius - proximity)/source.blastRadius;
		var impact = Math.min(Math.floor(source.blastForce * ratio), source.blastForce);
		var forceV = {x: unitV.x * impact, y: unitV.y * impact};

		//increase vectors based on Tank's impulse resistance.
		forceV.x *= this.damage/tankMass;

		//apply acceleration based on tank's current distance from the ground.
		this.solid.deltaX += forceV.x;
		if(this.isSeated){
			this.isSeated = false;
			if(forceV.y > 0){
				this.solid.deltaY -= forceV.y;
			} else{
				this.solid.deltaY += forceV.y;
			}
		} else {
			this.solid.deltaY -= forceV.y;
		}

		console.log("in Tank.impulse(): forceX: " + forceV.x + ", forceY: " + forceV.y);
	}

	this.explode = function(){
		//createExplosion(this, 200, true);
		this.isAlive = false;
		sfx[4].play();
		this.solid.xPos = null;
		this.solid.yPos = null;

		//giant explosion from off-screen


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

function getDistance(mobjA, mobjB){
	mobjA.center = {x:(mobjA.xPos + mobjA.sizeX/2),  y: (mobjA.yPos + mobjA.sizeX/2)};
	mobjB.center = {x:(mobjB.xPos + mobjB.sizeX/2), y: (mobjB.yPos + mobjB.sizeY/2)};
	var distX = (mobjA.center.x - mobjB.center.x);
	var distY = Math.abs( mobjA.center.y - mobjB.center.y );
	var magnitude = Math.sqrt(distX*distX + distY*distY);
	return magnitude;
}

//========================================================================================================================
//WORLD INITIALIZATION

function buildTerrain(){
	fractalPoints[0] = {x:0, y:display.height * (2/3)}; //start point
	for(var ii = 0; ii < terrainComplexity; ++ii){
		fractalPoints[ii+1] = {x: fractalPoints[ii].x + utils.getRandomInt(display.width/10, display.width/terrainComplexity), 
							 y: fractalPoints[ii].y + utils.getRandomInt(-terrainComplexity, terrainComplexity) * 16};
	}
	fractalPoints[fractalPoints.length] = {x:display.width, y:display.height * (2/3)}; //end point

	for(var kk = 0; kk <= display.width; kk += terrainChunkWidth ){
		var xPos = kk - terrainChunkWidth;

		for(var ii = 0; ii < fractalPoints.length-1; ++ii){
			if(fractalPoints[ii+1].x > xPos - terrainChunkWidth/2){
				var slope = (fractalPoints[ii].y - fractalPoints[ii+1].y)/(fractalPoints[ii+1].x - fractalPoints[ii].x);
				var leftIntercept = fractalPoints[ii].y + fractalPoints[ii].x * slope;
				var sizeY = display.height - Math.max(leftIntercept - (xPos + terrainChunkWidth/2) * slope, 0);
				break;
			}
		}
		var yPos =  display.height - sizeY;

		var grain = new MObj(xPos, yPos, 0, 0, terrainChunkWidth, sizeY, LIME_25);
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

function destroyTerrain(shot){
	var crater = [];
	var craterRadius = shot.blastRadius * terrainSoftness;

	for(var ii = -craterRadius; ii < craterRadius; ++ii){
		var height = craterDepth * Math.sqrt(craterRadius * craterRadius - ii*ii)  //(craterRadius * Math.cos(theta)) * craterDepth;
		var x = shot.xPos + ii * craterChunkwidth;
		var y = height + shot.yPos;
		//console.log("In destroyTerrain(): height:" + height + ", x:" + x + ", y:" + y);
		crater[ii + craterRadius] = new MObj(x, y, 0, 0, craterChunkwidth, height*2, "black");
	}

	for(var ii = 0; ii < terrain.length; ++ii){
		for(var kk = 0; kk < crater.length; ++kk){
			if(crater[kk].isIntersecting(terrain[ii])){
				if(crater[kk].yPos <= terrain[ii].yPos){
					var remove = Math.max((crater[kk].yPos + crater[kk].sizeY) - terrain[ii].yPos,0);
				} else{
					var remove = Math.max(crater[kk].sizeY,0);
				}
				terrain[ii].yPos += remove;
				terrain[ii].sizeY -= remove;
			}
		}
	}
}


function setGUI(player){


}

//=======================================================================================
//Event Handlers

function onMouseMove(event) {
	mousePosition = { x: event.pageX, y: event.pageY };
}

function onMouseDown(event) {
	mouseClick = true;
}

function onMouseUp(event) {
	mouseClick = false;
}

function onKeyDown(event){
	switch(event.keyCode){
		case 32: //space bar
			audioOn = !audioOn; 
			if(audioOn){
				for(var ii = 0; ii < sfx.length; ++ii){
					sfx[ii].volume(0.5);
				}
			} else{
				for(var ii = 0; ii < sfx.length; ++ii){
					sfx[ii].volume(0.0);
				}
			}
			break;
		default:
			break;
	}
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

	//gameover fireworks
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


function single_explode(shot){ //single is the shot type.  Other weapons could be named such: cluster_bomb(), laser_hit(), napalm_explode(); but most weapons can be defined by spawning explosions in the necessary pattern or random spread using single_explode(), or by creating new projectiles that use single.explode();
	if(shot.isIntersecting(p1.solid)){
		p2.score += directHitVal;
		p1.damage += directHitVal;
		p1.impulse(shot);
		addDamageText(directHitVal, p1.solid.xPos, p1.solid.yPos);
	} else {
		var distance_p1 = shot.distanceTo(p1.solid);
		if(distance_p1 <= shot.blastRadius){
			var dmg = getDamage(distance_p1, shot.blastRadius, directHitVal);
			p2.score += dmg;
			p1.damage += dmg;
			p1.impulse(shot);
			addDamageText(dmg, p1.solid.xPos, p1.solid.yPos);
		}
	}

	if(shot.isIntersecting(p2.solid)){
		p1.score += directHitVal;
		p2.damage += directHitVal;
		p2.impulse(shot);
		addDamageText(directHitVal, p2.solid.xPos, p2.solid.yPos);
	} else {
		var distance_p2 = shot.distanceTo(p2.solid);
		if(distance_p2 <= shot.blastRadius){
			var dmg = getDamage(distance_p2, shot.blastRadius, directHitVal);
			p1.score += dmg;
			p2.damage += dmg;
			p2.impulse(shot);
			addDamageText(dmg, p2.solid.xPos, p2.solid.yPos);
		}
	}

	p1.reSeat();
	p2.reSeat();	
	shot.sfx.play();
	createExplosion(shot, particlesPerBurst, utils.getRandomBool());
	destroyTerrain(shot);
	explosions.push(shot);
}

function getDamage(distance, radius, impact){
	var proximity = distance - playerHitBoxSize;
	var ratio = (radius - proximity)/radius;
	var dmg = Math.min(Math.floor(impact * ratio), impact);
	return dmg;
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
	for (var ii = projectiles.length - 1; ii >= 0; --ii) {
		projectiles[ii].updatePhysics();
		projectiles[ii].deltaY += missileGravity;

		if( projectiles[ii].intersectsTerrain() || 
			projectiles[ii].isIntersecting(p1.solid) || 
			projectiles[ii].isIntersecting(p2.solid)  ){

			single_explode(projectiles[ii]);
			projectiles.splice(ii,1);
		} else if(projectiles[ii].isOffScreen()){
			projectiles.splice(ii,1);
		}

	}

}



function updateParticles() {
	for (var ii = particles.length - 1; ii >= 0; --ii) {
		particles[ii].updatePhysics();
		
		// add some acceleration from gravity each frame.
		particles[ii].deltaY += particleGravity;
		particles[ii].alpha -= particleFade;

		particles[ii].color = setAlpha(particles[ii].color, particles[ii].alpha);

		if(particles[ii].bounce != null){
			if(particles[ii].intersectsTerrain()){
				if(particles[ii].deltaY > 0){
					particles[ii].deltaY = -particles[ii].deltaY;
				} else {
					particles[ii].deltaX = -particles[ii].deltaX;
				}
			}
		}

		// remove particles that are no longer on screen.
		var shouldRemoveParticle = particles[ii].isOffScreen();

		if(particles[ii].alpha <= 0){
			shouldRemoveParticle = true;
		}
		
		if (shouldRemoveParticle) {
			particles.splice(ii, 1);
		}	
	}
}



function updateDamageText(){
	for (var ii = damageText.length - 1; ii >= 0; --ii) {
		damageText[ii].updatePhysics();

		damageText[ii].alpha -= textFade;
		damageText[ii].color = setAlpha(damageText[ii].color, damageText[ii].alpha);

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
	drawTerrainMask();

	if(p1.isAlive){
		p1.solid.draw();
	}
	if(p2.isAlive){
		p2.solid.draw();
	}

	drawParticles();
	drawProjectiles();
	drawExplosions();
	drawTerrainChunks();
	drawGUI();
	drawDamageTexts();
}



function drawBackdrop(){
	var grad = ctx.createLinearGradient(0,display.height/5,0,display.height);
	grad.addColorStop(0,"black");
	grad.addColorStop(1,"purple");

	ctx.fillStyle = grad;
	ctx.fillRect(0,0, display.width, display.height);

}



function drawGUI(){

	//draw audio icon:
	if(audioOn){
		ctx.save();
		ctx.globalAlpha = .7;
		ctx.drawImage(images["audio"], display.width - 56, 40);
		ctx.restore();
	} else {
		ctx.save();
		ctx.globalAlpha = .4;
		ctx.drawImage(images["audio"], display.width - 56, 40);
		ctx.restore();
	}

	//draw translucent boxes around the player's angle and power readout to indicate whose turn it is.
	if(gameState >= 1 && gameState < 5){
		ctx.save();
		ctx.globalAlpha = .5;
		ctx.fillStyle = p1.solid.color;
		ctx.fillRect(p1_nums_x - 28, p1_nums_y - 56 , 152, 100 );
		ctx.restore();
	}
	if(gameState >= 5 && gameState < 9){
		ctx.save();
		ctx.globalAlpha = .4;
		ctx.fillStyle = p2.solid.color;
		ctx.fillRect(p2_nums_x - 28, p1_nums_y - 56 , 152, 100 );
		ctx.restore();
	}

	ctx.fillStyle = "#FFFFFF";
	ctx.font = "16px Arial";
	//ctx.fillText("FIRE!", display.width/2 - 32, display.height * (7/8));

	//angle and power for both players
	ctx.fillText("ANGLE: " + Math.floor(utils.toDegrees(p1.angle)), p1_nums_x, p1_nums_y - 16 );
	ctx.fillText("POWER: " + p1.power, p1_nums_x, p1_nums_y + 16 );
	ctx.fillText("ANGLE: " + Math.floor(utils.toDegrees(p2.angle)), p2_nums_x, p2_nums_y - 16 );
	ctx.fillText("POWER: " + p2.power, p2_nums_x, p2_nums_y + 16 );

	//player's damage numbers
	ctx.save();
	if(p1.damage > tankMass){
		ctx.fillStyle = RED;
		ctx.font = "20px Arial";
	}
	ctx.fillText("Player 1: " + (p1.damage - 1), 32, 32);
	ctx.restore();
	ctx.save();
	if(p2.damage > tankMass){
		ctx.fillStyle = RED;
		ctx.font = "20px Arial";
	}
	ctx.fillText("Player 2: " + (p2.damage - 1), display.width - 150, 32);
	ctx.save();

	//Draw angle indicator lines
	for(var ii = 0; ii < lines.length; ii+=2){
		ctx.strokeStyle = "#FFFFFF";
		ctx.beginPath();
		ctx.moveTo(lines[ii].x, lines[ii].y);
		ctx.lineTo(lines[ii+1].x, lines[ii+1].y);
		ctx.closePath();
		ctx.stroke();
	}
	lines.splice(0,lines.length); //clear the array without wasting more memory.

	//Draw Power indicator bar
	if(powerBar != null){
		var grad = ctx.createLinearGradient(display.width * (2/7), 0, display.width * (5/7), 0);
		grad.addColorStop(0, SEAFOAM);
		grad.addColorStop(1, GOLDEN_YELLOW);
		ctx.fillStyle = grad;
		ctx.fillRect(display.width * (2/7), display.height *(1/5) - 4, powerBar.x, powerBar.y);
		powerBar = null;
	}

	//gameover
	if(gameState == 9){
		ctx.save();
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
		ctx.restore();
	}
}



function drawParticles() {
	for (var ii = 0; ii < particles.length; ++ii) {
		particles[ii].draw();
	}
}


function drawProjectiles() {
	for (var ii = 0; ii < projectiles.length; ++ii) {
		projectiles[ii].draw();
	}
}

function drawDamageTexts() {
	ctx.font = "14px Arial";
	for (var ii = 0; ii < damageText.length; ++ii) {
		var text = String(damageText[ii].text);
		var textSize = ctx.measureText(text);
		//console.log("in drawDamageTexts(): text: " + text + ", size:" + textSize.width);
		ctx.fillStyle = damageText[ii].color;
		ctx.fillText(text, damageText[ii].xPos - textSize.width/2, damageText[ii].yPos + 24);
	}
}


function drawTerrainMask() {
	var grad = ctx.createLinearGradient(0,display.height,0,display.height/2);
	grad.addColorStop(0,DARKER_BROWN);
	grad.addColorStop(1,BROWN);
	ctx.fillStyle = grad;

	// if(displayChunks){
	// 	ctx.beginPath();
	// 	ctx.moveTo(terrainMask[0].x, terrainMask[0].y);
	// 	for (var ii = 0; ii < terrainMask.length - 1; ++ii) {
	// 		ctx.lineTo(terrainMask[ii+1].x, terrainMask[ii+1].y);
	// 	};
	// 	ctx.fill();
	// }

	drawTerrainChunks();

}


function drawTerrainChunks(){
	var grad = ctx.createLinearGradient(0,display.height,0,display.height/2);
	grad.addColorStop(0,OLIVE);
	grad.addColorStop(1,LEAF);
	ctx.fillStyle = grad;

	for (var ii = 0; ii < terrain.length; ++ii) {
		ctx.fillRect(terrain[ii].xPos, terrain[ii].yPos, terrain[ii].sizeX, terrain[ii].sizeY);
	}
	
}

function drawExplosions(){
	ctx.save();
	for(var ii = 0; ii < explosions.length; ++ii){
		ctx.fillStyle = "orange";
		ctx.beginPath();
      	ctx.arc(explosions[ii].xPos + explosions[ii].sizeX/2, explosions[ii].yPos + explosions[ii].sizeY/2, explosions[ii].blastRadius * visibleBlastRatio, 0, 2 * Math.PI, false);
      	ctx.fill();
      	ctx.closePath();
	}
	ctx.restore();
	explosions.splice(0,explosions.length);

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
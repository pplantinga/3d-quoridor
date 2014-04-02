var SCREEN_WIDTH = window.innerWidth;
var SCREEN_HEIGHT = window.innerHeight - 30;

var container, canvas, ctx, blockWidth, wallWidth;

// Three.js rendering stufs
var camera, scene, projector, pointlight;
var cameraCube, sceneCube;
var webglRenderer;

// Theme stufs
var currentTheme = "basic";
var themes = { 
	basic:      { cube:'SwedishRoyalCastle', size:9 }, 
	corralidor: { cube:'skybox',             size:9 },
	futuristic: { cube:'Bridge2',            size:9 },
	canvas:     { cube:'none',               size:9 } 
};

// The objects in the scene
var pawns, walls, tempWall, tempPawns, board, geometry; 

var boardSquareWidth = 6.25; // Distance from center to center

var TAU = Math.PI * 2; // CUZ PI IS WRONG!
var theta = 0, phi = TAU / 16, radius = 66, turnIncrement = TAU / 100; // CAMERA LOCATION STUFFS

// Key press stufs
var isLeftDown    = false;
var isUpDown      = false;
var isRightDown   = false;
var isDownDown    = false;
var isZoomInDown  = false;
var isZoomOutDown = false;

var pawn1selected = false;
var pawn2selected = false;

// Our model
var model = new Quoridor_Model( themes[currentTheme].size );

// Picking stufs
var mouse2D, mouse3D, ray;

// Theme changing buttons
var buttons = {
	basic:      document.getElementById( "basic" ), 
	corralidor: document.getElementById( "corralidor" ), 
	futuristic: document.getElementById( "futuristic" ),
	canvas:     document.getElementById( "canvas" ),
	help:       document.getElementById( "help" ),
	new:        document.getElementById( "new" ),
};

document.addEventListener( 'mousemove', onDocumentMouseMove, false);
document.addEventListener( 'mousedown', onDocumentMouseDown, false);
document.addEventListener( 'mousewheel', onDocumentMouseWheel, false);
document.addEventListener ("DOMMouseScroll", onDocumentMouseWheel, false);// Firefox
document.addEventListener( 'keydown', onDocumentKeyDown, false);
document.addEventListener( 'keyup', onDocumentKeyUp, false);
for (var i in buttons)
	buttons[i].addEventListener( "click", toggle, false);

init();
animate();

function init() {

	container = document.createElement('div');
	document.body.appendChild(container);
	
	if (currentTheme == "canvas") {
		canvas = document.createElement('canvas');
		if (canvas.getContext)
			ctx = canvas.getContext("2d");
		else
			alert("Your browser doesn't support the canvas element");
		boardSquareWidth = 2/9;
		container.appendChild(canvas);
		return;
	}
	
	scene = new THREE.Scene();
	sceneCube = new THREE.Scene();

	boardSquareWidth = 6.25;

	// LIGHTS

	var ambient = new THREE.AmbientLight( 0x999999);
	scene.addLight( ambient );

	var directionalLight = new THREE.DirectionalLight( 0x777777 );
	directionalLight.position.y = 70;
	directionalLight.position.z = 100;
	directionalLight.position.x = -100;
	directionalLight.position.normalize();
	scene.addLight( directionalLight );

	pointLight = new THREE.PointLight( 0xffaa55 );
	pointLight.position.x = 0;
	pointLight.position.y = 10;
	pointLight.position.z = 0;
//	scene.addLight( pointLight );

	// CAMERA
	
	camera = new THREE.Camera( 75, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 1000 );
	camera.position.y = radius * Math.sin(phi);
	camera.position.x = radius * Math.cos(phi) * Math.sin(theta);
	camera.position.z = radius * Math.cos(phi) * Math.cos(theta);

	
	cameraCube = new THREE.Camera( 50, SCREEN_WIDTH / SCREEN_HEIGHT, 1, 100 );

	camera.updateMatrix();

	// ACTION
	
	try {
		webglRenderer = new THREE.WebGLRenderer();
		webglRenderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
		webglRenderer.autoClear = false;
		webglRenderer.domElement.style.position = "relative";
		container.appendChild( webglRenderer.domElement );
	}
	catch (e) {
	  alert("failure");
	}

	// PICKING (not your nose)
	
	projector = new THREE.Projector();
	mouse2D = new THREE.Vector3( 0, 0, 0.5 );
	ray = new THREE.Ray( camera.position, null );

	load();

}

function load() {

	//beginCubeMapStuff
	var path = "cube/" + themes[currentTheme].cube + "/";
	var format = '.jpg';
	var urls = [
			path + 'px' + format, path + 'nx' + format,
			path + 'py' + format, path + 'ny' + format,
			path + 'pz' + format, path + 'nz' + format
		];

	var reflectionCube = THREE.ImageUtils.loadTextureCube( urls );
//	var refractionCube = new THREE.Texture( reflectionCube.image, new THREE.CubeRefractionMapping() );

	//var cubeMaterial3 = new THREE.MeshPhongMaterial( { color: 0x000000, specular:0xaa0000, envMap: reflectionCube, combine: THREE.MixOperation, reflectivity: 0.25 } );
//	var cubeMaterial3 = new THREE.MeshLambertMaterial( { color: 0xff6600, envMap: reflectionCube, combine: THREE.MixOperation, reflectivity: 0.3 } );
//	var cubeMaterial2 = new THREE.MeshLambertMaterial( { color: 0xffee00, envMap: refractionCube, refractionRatio: 0.95 } );
//	var cubeMaterial1 = new THREE.MeshLambertMaterial( { color: 0xffffff, envMap: reflectionCube } )

	THREE.SceneUtils.addPanoramaCubeWebGL( sceneCube, 10, reflectionCube );
	//endCubeMapStuff
	
	var loader = new THREE.JSONLoader();

	loader.load( { model: "obj/" + currentTheme + "/pawn.js", callback: function( geometry ) { addPawns( geometry ); } } );
	loader.load( { model: "obj/" + currentTheme + "/wall.js", callback: function( geometry ) { addWalls( geometry ); } } );
	loader.load( { model: "obj/" + currentTheme + "/board.js", callback: function( geometry ) { 
		board = addObject( geometry, "board", new THREE.MeshFaceMaterial(), board, 0 ); } } );
}

/*
 * adds the pawn objects to the scene after initialization
 */
function addPawns( geometry ) {
	pawns = new Array();
	pawns[0] = addObject( geometry, "pawn1", new THREE.MeshLambertMaterial( {color: 0xFFFFFF} ), pawns[0], TAU/2);
	pawns[1] = addObject( geometry, "pawn2", new THREE.MeshLambertMaterial( {color: 0x660066} ), pawns[1], 0);
	placePawn(pawns[0], model.getLocation(0, 'x'), model.getLocation(0, 'y') );
	placePawn(pawns[1], model.getLocation(1, 'x'), model.getLocation(1, 'y') );
	
	tempPawns = new Array();
	for (var i = 0; i < 5; i++) {
		tempPawns[i] = addObject( geometry, "tempPawn" + i, new THREE.MeshBasicMaterial( {color: 0xffcc66, opacity: 0.5} ), tempPawns[i], 0 );
		hidePawn(tempPawns[i]);
	}
}

//Hides a pawn by displaying it really far away
function hidePawn( pawn ) {
		placePawn( pawn, 1000, 1000 ); 
}

/*
 * creates an array of 20 walls and puts them at the starting location
 */
function addWalls( geometry ) {
	walls = new Array();
	for (var j = 0; j < 2; j++) {
		walls[j] = new Array();
		for (var k = 0; k < 10; k++) {
			walls[j][k] = addObject( geometry, "wall", new THREE.MeshFaceMaterial(), walls[j][k], 0 );
			if (model.wallLocations[j][k])
				placeWall(walls[j][k], model.wallLocations[j][k].x, model.wallLocations[j][k].y, model.wallLocations[j][k].o);
			else
				placeWall(walls[j][k], k - 1, (j * 11) - 2, 0);
		}
	}
	tempWall = addObject( geometry, "tempWall", new THREE.MeshBasicMaterial( {color: 0xffcc66, opacity: 0.5} ), tempWall, 0 );
	placeWall(tempWall, 1000, 1000, 0);
}

/*
 * Adjusts a pawn's x and z coordinates based on board coordinates
 * coord is a 2 element array with values from 0-8 representing the x and z position on the board respectively
 */
function placePawn( pawn, x, y ) {
	pawn.position.x = boardSquareWidth * (x - 4);
	pawn.position.z = boardSquareWidth * (y - 4);
	pawn.rotation.y = model.turn || pawn.name == "pawn2" ? 0 : TAU / 2;
}

/* 
 * Adjusts a wall's x and z coordinates based on board coordinates
 * coord is a 2 element array with values from 0-8 representing the x and z position on the board respectively
 * orient tells if it is horizontal or vertical, 0 for horizontal 1 for vertical
 */
function placeWall( wall, x, y, orient ) {
	wall.position.x = boardSquareWidth * (x - 3.5);
	wall.position.z = boardSquareWidth * (y - 3.5);
	wall.rotation.y = orient * TAU / 4;
}

//adds obj to the scene rotated in the direction of ry, rz with material
function addObject( geometry, name, material, obj, ry) {

	for (var i in geometry.materials) {
		if (geometry.materials[i][0].map) {
			geometry.materials[i][0].map.wrapS = THREE.RepeatWrapping;
			geometry.materials[i][0].map.wrapT = THREE.RepeatWrapping;
		}
	}
	
	obj = new THREE.Mesh( geometry, material );
	obj.name = name;
	obj.rotation.y = ry;
	obj.overdraw = true;
	obj.updateMatrix();
	scene.addObject(obj);
	return obj;
}

function onDocumentMouseMove(event) {
	event.preventDefault();
	
	// translates screen coordinates to some other kind
	mouse2D.x = ( event.offsetX / SCREEN_WIDTH ) * 2 - 1;
	mouse2D.y = - ( event.offsetY / SCREEN_HEIGHT ) * 2 + 1;

	if (currentTheme == "canvas" && !pawn1selected && !pawn2selected) {
		var posX = ( ( event.offsetX + SCREEN_HEIGHT / 2 - SCREEN_WIDTH / 2 ) / SCREEN_HEIGHT ) * 2 - 1;
		var posY = ( event.offsetY / SCREEN_HEIGHT ) * 2 - 1;
		tempWall.x = posToWallElement( posX );
		tempWall.y = posToWallElement( posY );
		tempWall.o = findOrientation( posX, posY );
	}

	if (currentTheme != "canvas" && !pawn1selected && !pawn2selected) {
		// render temporary walls
		var intersects = ray.intersectScene( scene );
		if ( intersects.length > 0 ) {
			for (var i in intersects) {
				if (intersects[i].object.name == "pawn1" && model.turn == 0 || intersects[i].object.name == "pawn2" && model.turn == 1 ) {
					placeWall(tempWall, 1000, 1000, 0);
					break;
				}
				if (intersects[i].object.name == "board") {
					var 	wallx = posToWallElement(intersects[i].point.x),
						wally = posToWallElement(intersects[i].point.z),
						o = findOrientation(intersects[i].point.x, intersects[i].point.z);
			
					if ( model.isLegalWall(wallx, wally, o) ) {
						placeWall(tempWall, wallx, wally, o);
					} else
						placeWall(tempWall, 1000, 1000, 0);
					break;
				}
			}
		}
	}
}

//figures out what is underneath where you clicked, and puts those in order in the intersector variable
function onDocumentMouseDown(event) {

	event.preventDefault();

	if ( currentTheme == "canvas" ) {
		// need another transform
		var posX = ( ( event.offsetX + SCREEN_HEIGHT / 2 - SCREEN_WIDTH / 2 ) / SCREEN_HEIGHT ) * 2 - 1;
		var posY = ( event.offsetY / SCREEN_HEIGHT ) * 2 - 1;
		var x = posToElement( posX ),
		    y = posToElement( posY ),
		    o = findOrientation( posX, posY ),
		wallx = posToWallElement( posX ),
		wally = posToWallElement( posY );

		if ( x == model.getLocation( 0, 'x' ) && y == model.getLocation( 0, 'y' ) && model.turn == 0 ) {
			pawn1selected = !pawn1selected;
			return;
		} else if ( x == model.getLocation( 1, 'x' ) && y == model.getLocation( 1, 'y' ) && model.turn == 1 ) {
			pawn2selected = !pawn2selected;
			return;
		}

		if (pawn1selected || pawn2selected) {
			if (model.move(x, y)) {
				if (y == 0 && model.turn == 1 || y == 8 && model.turn == 0)
					alert("Player " + (model.turn + 1) + " Wins!");
				model.turn = (model.turn + 1) % 2;
				pawn1selected = pawn2selected = false;
			}
		}
		
		else if (model.wall(wallx, wally, o)) {
			model.turn = (model.turn + 1) % 2;
		}
		
		return;
	}
	
	mouse3D = projector.unprojectVector( mouse2D.clone(), camera );
	ray.direction = mouse3D.subSelf( camera.position ).normalize();

	var intersects = ray.intersectScene( scene );
	
	if ( intersects.length > 0 ) {
		if (intersects[0].object.name == "pawn1" && model.turn == 0) {
			pawn1selected = !pawn1selected;
		}
		if (intersects[0].object.name == "pawn2" && model.turn == 1) {
			pawn2selected = !pawn2selected;
		}
		if (pawn1selected || pawn2selected) {
			placeWall(tempWall, 1000, 1000, 0);
			displayTempPawns();
		} else {
			hideTempPawns();
		}
		for (var i in intersects) {
			if (intersects[i].object.name == "board" || intersects[i].object.name.substring(0, 8) == "tempPawn") {
				intersector = intersects[i];
				break;
			}
		}
		
		if ( intersector ) {
			var x = posToElement(intersector.point.x),
			    y = posToElement(intersector.point.z),
					o = findOrientation(intersector.point.x, intersector.point.z),
			wallx = posToWallElement(intersector.point.x),
			wally = posToWallElement(intersector.point.z);

			if (pawn1selected || pawn2selected) {
				if (model.move(x, y)) {
					placePawn(pawns[model.turn], x, y);
		 			hideTempPawns();
					if (y == 0 && model.turn == 1 || y == 8 && model.turn == 0)
						alert("Player " + (model.turn + 1) + " Wins!");
					model.turn = (model.turn + 1) % 2;
					pawn1selected = pawn2selected = false;
				}
			}
			
			else if (model.wall(wallx, wally, o)) {
				placeWall(walls[model.turn][model.wallsLeft()], wallx, wally, o);
				model.turn = (model.turn + 1) % 2;
			}
		} 
	}
}

function onDocumentMouseWheel(event) {
  var rolled = event.wheelDelta ? - event.wheelDelta / 40 : event.detail;
  if (radius > 5 || rolled > 0)
  		radius += rolled;
}

function displayTempPawns() {
	var moves = new Array();
	moves = model.listLegalMoves();
	for (var i = 0; i < moves.length; i++) {
		currentTheme == "canvas" ? paintPawn('lightgray', moves[i].x, moves[i].y) : placePawn(tempPawns[i], moves[i].x, moves[i].y);
	}
}

//hide all of the temporary pawns
function hideTempPawns() {
	for (var i = 0; i < tempPawns.length; i++) {
		hidePawn(tempPawns[i]);
	}
}

function posToElement(pos) {
	return Math.floor(pos / boardSquareWidth + 4.5);//for great justice.
}

function posToWallElement(pos) {
	return Math.floor(pos / boardSquareWidth + 4);//for great justice.
}

//Given an x, y as world coordinates, decides if a wall placed at this location would be better as horizontal or vertical
function findOrientation(x, y) {
	return Math.floor((x - y + boardSquareWidth * 9) / boardSquareWidth) % 2 != Math.floor((x + y + boardSquareWidth * 9) / boardSquareWidth) % 2;
}

// looks for keys that are really sad (depressed)
function onDocumentKeyDown( event ) {
	switch( event.keyCode ) {
		case 33:
			isZoomInDown  = true; break;
		case 34:
			isZoomOutDown = true; break;
		case 37: 
		case 65:
			isLeftDown    = true; break;
		case 38:
		case 87:
			isUpDown      = true; break; 	
		case 39:
		case 68:
			isRightDown   = true; break; 
		case 40:	
		case 83:
			isDownDown    = true; break;
	}
}

// hopes that keys are less sad
function onDocumentKeyUp( event ) {
	switch( event.keyCode ) {
		case 33:
			isZoomInDown  = false; break;
		case 34:
			isZoomOutDown = false; break;
		case 37: 
		case 65:
			isLeftDown    = false; break;
		case 38:
		case 87:
			isUpDown      = false; break; 	
		case 39:
		case 68:
			isRightDown   = false; break; 
		case 40:	
		case 83:
			isDownDown    = false; break;
	}
}

//draws the next frame just about as fast as it can
function animate() {
	window.setTimeout( animate, 1000 / 60 );
	render();
}

//does camera stuff
//also uses an alternate camera to produce a view of the cubemap that can be used for reflections and whatnot
//does the rendering
function render() {

	SCREEN_WIDTH = window.innerWidth;
	SCREEN_HEIGHT = window.innerHeight - 30;

	if (currentTheme == "canvas") {

		canvas.width = SCREEN_WIDTH;
		canvas.height = SCREEN_HEIGHT;
		blockWidth = SCREEN_HEIGHT / (themes[currentTheme].size * 4/3);
		wallWidth = SCREEN_HEIGHT / themes[currentTheme].size - blockWidth;
	
		ctx.clearRect( 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT );
		
		for (var i = 0; i < 9; i++) {
			for (var j = 0; j < 9; j++) {
				if (j == 0 || j == 8) {
					if ( j == 8 ) {
							var color1 = "red";//document.getElementById("color1").value;
							ctx.fillStyle = (color1);
					} else {
							var color2 = "blue";//document.getElementById("color2").value;
							ctx.fillStyle = (color2);
					} 
					ctx.fillRect( SCREEN_HEIGHT*i/9+SCREEN_WIDTH/2-SCREEN_HEIGHT/2-1, SCREEN_HEIGHT*j/9+wallWidth/2, blockWidth+2, blockWidth+2 );
					ctx.fillStyle = "888";
				} else
					ctx.fillStyle = "666";
				ctx.fillRect( SCREEN_HEIGHT*i/9+SCREEN_WIDTH/2-SCREEN_HEIGHT/2, SCREEN_HEIGHT*j/9+wallWidth/2+1, blockWidth, blockWidth );
				if (i == 0) {
					ctx.fillStyle = "fff";
					ctx.fillText( j+1, SCREEN_WIDTH/2-SCREEN_HEIGHT/2+wallWidth/2, SCREEN_HEIGHT*j/9+blockWidth );
				} if (j == 8) {
					ctx.fillStyle = "fff";
					ctx.fillText( numberToLetter(i), SCREEN_HEIGHT*i/9+blockWidth+SCREEN_WIDTH/2-SCREEN_HEIGHT/2-wallWidth/2, SCREEN_HEIGHT-wallWidth );
				}
			}
		}

		paintWalls();
		paintPawns();
	}

	//adjust camera position based on keyboard keys
	if(isZoomInDown && radius > 2)
		radius--;
	if(isZoomOutDown)
		radius++;
	if(isLeftDown)
		theta -= turnIncrement;
	if(isUpDown && phi < TAU / 4 - turnIncrement)
	  phi += turnIncrement;
	if(isRightDown)
		theta += turnIncrement;
	if(isDownDown && phi > turnIncrement)
		phi -= turnIncrement;

	camera.position.y = radius * Math.sin(phi);
	camera.position.x = radius * Math.cos(phi) * Math.sin(theta);
	camera.position.z = radius * Math.cos(phi) * Math.cos(theta);

	camera.updateMatrix();

	cameraCube.target.position.x = - camera.position.x;
	cameraCube.target.position.y = - camera.position.y;
	cameraCube.target.position.z = - camera.position.z;


  mouse3D = projector.unprojectVector( mouse2D.clone(), camera );
	ray.direction = mouse3D.subSelf( camera.position ).normalize();


	webglRenderer.clear();
	webglRenderer.enableDepthBufferWrite( false );
	webglRenderer.render( sceneCube, cameraCube );
	webglRenderer.enableDepthBufferWrite( true );
	webglRenderer.render( scene, camera );

}

/*
* This function paints all the walls
*/
function paintWalls() {
	for (var i = 0; i < 2; i++)
		for (var j = 0; j < 10; j++)
			if (model.wallLocations[i][j])
				paintWall("743", model.wallLocations[i][j].x, model.wallLocations[i][j].y, model.wallLocations[i][j].o);
			else
				paintWall("743", i * 11 - 2, j - 1, 1);

	if ( !pawn1selected && !pawn2selected && model.isLegalWall( tempWall.x, tempWall.y, tempWall.o ) )
		paintWall("964", tempWall.x, tempWall.y, tempWall.o);
}

/*
* This function paints a wall
*/
function paintWall(color, x, y, o) {
	ctx.fillStyle = color;
	if (o)
		ctx.fillRect(SCREEN_HEIGHT*x/9+SCREEN_WIDTH/2-SCREEN_HEIGHT/2, SCREEN_HEIGHT*y/9+blockWidth+wallWidth/2, 2*blockWidth+wallWidth, wallWidth);
	else
		ctx.fillRect(SCREEN_HEIGHT*x/9+SCREEN_WIDTH/2-SCREEN_HEIGHT/2+blockWidth, SCREEN_HEIGHT*y/9+wallWidth/2, wallWidth, 2*blockWidth+wallWidth);
}

/*
* This function paints the two pieces
*/
function paintPawns() {
	paintPawn("red"/*document.getElementById('color1').value*/, model.getLocation(0, 'x'), model.getLocation(0, 'y') );
	paintPawn("blue"/*document.getElementById('color2').value*/, model.getLocation(1, 'x'), model.getLocation(1, 'y') );
	if (pawn1selected || pawn2selected)
		displayTempPawns();
}

/*
* this paints one piece
*/
function paintPawn(color, x, y) {
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.arc( SCREEN_HEIGHT * x / 9 + SCREEN_WIDTH / 2 - SCREEN_HEIGHT / 2 + blockWidth / 2, 
		SCREEN_HEIGHT * y / 9 + blockWidth * 2 / 3, blockWidth / 2 - 5, 0, TAU, false );
	ctx.fill();
}

function numberToLetter(num) {
	switch (num) {
		case 0:
			return 'a';
		case 1:
			return 'b';
		case 2:
			return 'c';
		case 3:
			return 'd';
		case 4:
			return 'e';
		case 5:
			return 'f';
		case 6:
			return 'g';
		case 7:
			return 'h';
		case 8:
			return 'i';
	}
}

//switch the themes if the theme buttons get clicked
function toggle(event) {
	if (event.currentTarget.id != "new") {
		for (var i in buttons) {
			if (i == event.currentTarget.id)
				buttons[i].className = "button active";
			else
				buttons[i].className = "button";
		}
		currentTheme = event.currentTarget.id;
	}

	// remove the old div
	document.body.removeChild(container);

	// if they hit the "new game" button, restart the model
	if (event.currentTarget.id == "new")
		model = new Quoridor_Model( themes[currentTheme].size );

	// restart the div
	if (event.currentTarget.id == "help")
		helpPage();
	else
		init();
}

function helpPage() {
	container = document.createElement('div');
	container.innerHTML = "<h1>Hello there captain!</h1>"
		+ "<h3>Rules:</h3>"
		+ "Every turn a player may either move his pawn one space or place a wall.<br>"
		+ "The goal is to reach the other side before your opponent reaches yours.<br>"
		+ "You aren't allowed to block either player from reaching the other side."
		+ "<h3>Movement:</h3>"
		+ "To move a piece, click on it, and then on the destination square.<br>"
		+ "To place a wall, click on the place that you want it.<br>"
		+ "To rotate the camera use WASD or the arrow keys.<br>"
		+ "To zoom use the mouse wheel or 'page up' and 'page down'.";
	container.className = "d";
	document.body.appendChild(container);
}

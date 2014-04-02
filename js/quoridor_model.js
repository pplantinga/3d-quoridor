/*
 * Peter's quoridor model
 */
var Quoridor_Model = function(boardSize) {
	this.size = 2 * boardSize - 1;
	this.board = new Array(this.size);
	
	for (var i = 0; i < this.size; i++) {
		this.board[i] = new Array(this.size);
		for (var j = 0; j < this.size; j++)
			this.board[i][j] = 0;
	}
	
	this.locations = [ { x:Math.floor(this.size / 2), y:0 }, { x:Math.floor(this.size / 2), y:this.size - 1 } ];
	this.board[this.locations[0].x][this.locations[0].y] = 1;
	this.board[this.locations[1].x][this.locations[1].y] = 2;
	this.walls = [10, 10];
	this.wallLocations = [];
	this.wallLocations[0] = new Array(10);
	this.wallLocations[1] = new Array(10);
	this.potentialMoveOffsets = [[0, 1], [-1, 0], [1, 0], [0, -1]];
	this.turn = 0;
}

Quoridor_Model.prototype = {
	// Make your move
	move: function(new_x, new_y) {
		// Convert to board coordinates
		var x = 2 * new_x, y = 2 * new_y;
		
		// If legal, make the move
		if (this.isLegalMove(new_x, new_y)) {
			this.board[x][y] = this.turn + 1;
			this.board[this.locations[this.turn].x][this.locations[this.turn].y] = 0;
			this.locations[this.turn].x = x;
			this.locations[this.turn].y = y;
			return true;
		}
		return false;
	},

	// Returns an array of legal locations the active piece can move to
	listLegalMoves: function() {
		var moves = new Array();
		for (var i = 0; i < 9; i++) {
			for ( var j = 0; j < 9; j++) {
				var x = i;
				var y = j;
				if( this.isLegalMove(x, y) ) {
					moves[moves.length] = {x:x, y:y};
				}
			}	
		}
		return moves;
	},

	// Check if a move is legal
	isLegalMove: function(new_x, new_y) {
		// Convert to board coordinates
		var x = 2 * new_x, y = 2 * new_y, old_x = this.locations[this.turn].x, old_y = this.locations[this.turn].y;

		// Check legality
		if  ( this.isOnBoard(x) && this.isOnBoard(y) ) {
			if (this.board[x][y] == 0) {
			
				// normal move
				if (
					(
						(x == old_x + 2 || x == old_x - 2) //row is off by one 
						&& 
						y == old_y //same column
					||
						(y == old_y + 2 || y == old_y - 2) 
						&& 
						x == old_x
					)
					&& 
					this.board[(x + old_x) / 2][(y + old_y) / 2] != 3 ) //no wall between piece and target 
					return true;
		
				// jump in a straight line
				else if (
					(
						(old_x + 4 == x || old_x - 4 == x) //If the space in target is two away in the row
						&& 
						old_y == y 	//and in the same column
						&&
						this.board[(old_x + x) / 2 + 1][old_y] != 3 //next two: and there's no wall between you and the adjacent piece or adjacent piece and target
						&& 
						this.board[(old_x + x) / 2 - 1][old_y] != 3
					|| 
						(old_y + 4 == y || old_y - 4 == y) 
						&& 
						old_x == x 	
						&& 
						this.board[old_x][(old_y + y) / 2 + 1] != 3 
						&& 
						this.board[old_x][(old_y + y) / 2 - 1] != 3
					)
					&& 
					this.board[(old_x + x) / 2][(old_y+y) / 2] != 0 ) //and there's a piece between target and active piece
					return true;
																																				               
				//jump diagonally if blocked by enemy $piece and a wall or another enemy $piece and the edge of the board
				else if (
					(old_x + 2 == x || old_x - 2 == x) //You're looking at a spot with x value offset by one
					&& 
					(old_y + 2 == y || old_y - 2 == y) //and it has a y value offset by one
					&& 
					(
						this.board[x][old_y] != 0 //there's a piece adjacent
						&& 
						(!this.isOnBoard(x + (x - old_x) / 2) || this.board[x + (x - old_x) / 2][old_y] == 3) //there's a wall on the far side of them, or that goes off the board
						&& 
						this.board[(x + old_x) / 2][old_y] != 3 //there's no wall between you and piece to jump
						&& 
						this.board[x][(y + old_y) / 2] != 3 //there's no wall between piece to jump and spot to land
					|| 
						this.board[old_x][y] != 0 
						&& 
						(this.board[old_x][y + (y - old_y) / 2] == 3 ||	!this.isOnBoard(y + (y - old_y) / 2)) 
						&& 
						this.board[old_x][(y + old_y) / 2] != 3 
						&& 
						this.board[(x + old_x) / 2][y] != 3
					)
					) 
				return true; 
		 	}   
		}
	 	return false; 
	},

  //a function to tell you whether the given value is on the board
	isOnBoard: function(val) {
		return val < this.size && val >= 0;
	},

	// Place a wall
	wall: function(new_x, new_y, o) {
		// Convert to board coordinates
		var x = new_x * 2 + 1, y = new_y * 2 + 1, xadd = o ? 1 : 0, yadd = o ? 0 : 1;
		
		// If legal, place the wall
		if (this.isLegalWall(new_x, new_y, o)) {
			this.board[x][y] = 3;
			this.board[x - xadd][y - yadd] = 3;
			this.board[x + xadd][y + yadd] = 3; 
			this.walls[this.turn]--;
			this.wallLocations[this.turn][this.walls[this.turn]] = { x:new_x, y:new_y, o:o };
			return true;
		}
		return false;
	},

	// Check if a wall is legal
	isLegalWall: function(new_x, new_y, o) {
		// Convert to board coordinates
		var x = new_x * 2 + 1, y = new_y * 2 + 1, xadd = o ? 1 : 0, yadd = o ? 0 : 1;

		// Check legality
		return x < this.size && y < this.size && x >= 0 && y >= 0 && this.walls[this.turn] > 0
			&& this.board[x][y] != 3 && this.board[x - xadd][y - yadd] != 3 && this.board[x + xadd][y + yadd] != 3;
	},

	// Return the location of the piece in coordinates the view understands
	getLocation: function(piece, axis) {
		return this.locations[piece][axis] / 2;
	},

	// Return the number of walls the current player has left
	wallsLeft: function() {
		return this.walls[this.turn];
	}
}

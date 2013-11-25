var texSize = 1.0/8.0;
var renderCube;

function Octree(val) {
	this.value = val;
}

Octree.prototype.find = function(x,y,z,depth,atDepth) {
	if (!(this.value instanceof Array) || atDepth > --depth)
		return this.value;
	return this.value[(x>>depth&1) << 2 | (y>>depth&1) << 1 | (z>>depth&1)].find(x,y,z,depth,atDepth);
}

Octree.prototype.findUpTree = function(x,y,z,mx,my,mz,depth,atDepth) {
   	if (x>>>depth != mx>>>depth || y>>>depth != my>>>depth || z>>>depth != mz>>>depth) {
   		if (!this.origin)
   			return null;
   		else
   			return this.origin.findUpTree(x,y,z,mx,my,mz,depth+1,atDepth);
   	}
   	return this.find(x,y,z,depth,atDepth);
}


Octree.prototype.set = function(tx,ty,tz,depth,atDepth,val) {
	if (atDepth < depth--) {
		if (!(this.value instanceof Array))
			this.split(this.value);
			
		this.value[(tx>>depth&1)<<2 | (ty>>depth&1)<<1 | (tz>>depth&1)].set(tx,ty,tz,depth,atDepth,val);
	} else {
		this.value = val;
		
		if (this.origin)
			this.origin.resolveUp(val);
	}
}

Octree.prototype.getOnlyChild = function() {
	if (!(this.value instanceof Array)) 
		return null;

	var only = false;
	for (var t=0; t<8; t++) {
		if (this.value[t].value) {
			if (only)
				return null;
			else 
				only = this.value[t];
		}
	}
	return only;
	
}

Octree.prototype.split = function(val) {
	this.value = new Array(8);
	for (var t=0; t<8; t++) {
		this.value[t] = new Octree(val);
		this.value[t].origin = this;
	}
}

Octree.prototype.resolveUp = function(comp) {
	for (var t=0; t<8; t++) {
		if (comp != this.value[t].value)
			return;
	}
	
	this.value = comp;
	if (this.origin)
		this.origin.resolveUp(comp);
}

Octree.prototype.resolve = function() {
	if (!(this.value instanceof Array)) 
		return this.value;
	
	var comp = this.value[0].resolve();
	for (var t=1; t<8; t++) {
		if (comp != this.value[t].resolve())
			comp = -1;
	}
	
	if (comp != -1)
		this.value = comp;
	
	return comp;
}

Octree.prototype.radius = function(depth) {
	return (1<<depth) * 0.70710678118654752440084436210485; //sqrt(2)/2
}

Octree.prototype.accurateRadius = function(wPos,depth) {
	return Math.sqrt(this.findRadius(0,0,0,wPos,depth));
}

Octree.prototype.findRadius = function(tx,ty,tz,wPos,depth) {
	if (!this.value) {
		return 0 ;
	} else if (this.value instanceof Array) {
		var h = (1<<depth)*0.5;
		var max = 0;
		for (var t=0; t<8; t++) {
			var temp = this.value[t].findRadius(t&4?tx+h:tx,t&2?ty+h:ty,t&1?tz+h:tz,wPos,depth-1);
			if (temp > max)
				max = temp;
		}
		return max;
	} else {
		var h = (1<<depth)*0.5;
		var max = 0;
		for (var t=0; t<8; t++) {
			var ttx = (t&4?tx+h:tx) - wPos.x;
			var tty = (t&2?ty+h:ty) - wPos.y;
			var ttz = (t&1?tz+h:tz) - wPos.z;
			var temp = ttx*ttx+tty*tty+ttz*ttz;
			if (temp > max)
				max = temp;
		}
		return max;
	}
}

Octree.prototype.center = function(depth) {
	var wPos = {x:0.0,y:0.0,z:0.0,w:0.0};
	this.findCenter(wPos,0.0,0.0,0.0,depth);
	wPos.x /= wPos.w;
	wPos.y /= wPos.w;
	wPos.z /= wPos.w;
	return wPos;
}

Octree.prototype.findCenter = function(wPos,tx,ty,tz,depth) {
	if (!this.value) {
		return;
	} else if (this.value instanceof Array) {
		var h = (1<<depth)*0.5;
		for (var t=0; t<8; t++) {
			this.value[t].findCenter(wPos,t&4?tx+h:tx,t&2?ty+h:ty,t&1?tz+h:tz,depth-1);
		}
	} else {
		var mass = 1 << (3*depth);
		var h = (1<<depth)*0.5;
		wPos.x += (tx+h)*mass;
		wPos.y += (ty+h)*mass;
		wPos.z += (tz+h)*mass;
		wPos.w += mass;
	}
}


Octree.prototype.raycast = function(ox,oy,oz,dx,dy,dz,depth) {
	var s = 1<<depth;
	
	var tx0 = -ox/dx;
	var ty0 = -oy/dy;
	var tz0 = -oz/dz;
	var tx1 = (s-ox)/dx;
	var ty1 = (s-oy)/dy;
	var tz1 = (s-oz)/dz;
	
	if (isNaN(tx0)) tx0 = 0;
	if (isNaN(ty0)) ty0 = 0;
	if (isNaN(tz0)) tz0 = 0;
	if (isNaN(tx1)) tx1 = 0;
	if (isNaN(ty1)) ty1 = 0;
	if (isNaN(tz1)) tz1 = 0;
	
	return this.findRay(tx0,ty0,tz0,tx1,ty1,tz1);
}

Octree.prototype.findRay = function(tx0,ty0,tz0,tx1,ty1,tz1) {
	if (!this.value) {
		return null;
	} else if (this.value instanceof Array) {
		var tmin = Math.max(tx1>tx0?tx0:tx1, ty1>ty0?ty0:ty1, tz1>tz0?tz0:tz1);
		var tmax = Math.min(tx1>tx0?tx1:tx0, ty1>ty0?ty1:ty0, tz1>tz0?tz1:tz0);
		
		var txM = 0.5 * (tx0 + tx1);
		var tyM = 0.5 * (ty0 + ty1);
		var tzM = 0.5 * (tz0 + tz1);
		
		if (tmin < tmax) {
			var nearest;
			for (var t=0; t<8; t++) {
				var temp = this.value[t].findRay(t&4?txM:tx0, t&2?tyM:ty0, t&1?tzM:tz0, t&4?tx1:txM, t&2?ty1:tyM, t&1?tz1:tzM);
				if (temp && (!nearest || temp.t < nearest.t)) {
					nearest = temp;
				}
			}
			return nearest;
		} else {
			return null;
		}
	} else {
	
		var flipx = 0;
		if (tx1 < tx0) {	
			flipx = tx1;
			tx1 = tx0;
			tx0 = flipx;
			flipx = 8;
		}

		var flipy = 0;
		if (ty1 < ty0) {
			flipy = ty1;
			ty1 = ty0;
			ty0 = flipy;
			flipy = 8;
		}

		var flipz = 0;
		if (tz1 < tz0) {
			flipz = tz1;
			tz1 = tz0;
			tz0 = flipz;
			flipz = 8;
		}

		if (tx0 > ty0) {
			if (tx0 > tz0) {
				if (tx0 > 0 && tx0 < Math.min(tx1,ty1,tz1))
					return {node:this, t:tx0, face:4|flipx};
				else
					return null;
			} else {
				if (tz0 > 0 && tz0 < Math.min(tx1,ty1,tz1))
					return {node:this, t:tz0, face:1|flipz};
				else
					return null;
			}
		} else {
			if (ty0 > tz0) {
				if (ty0 > 0 && ty0 < Math.min(tx1,ty1,tz1))
					return {node:this, t:ty0, face:2|flipy};
				else
					return null;
			} else {
				if (tz0 > 0 && tz0 < Math.min(tx1,ty1,tz1))
					return {node:this, t:tz0, face:1|flipz};
				else
					return null;
			}
		}
	}
}

Octree.prototype.makeDisplay = function(buffer,x,y,z,depth) {  //TODO MOVE THIS TO END
	if (!this.value) {
		return null;
	} else if (this.value instanceof Array) {
		--depth;
		for(var t=0; t<8; t++) {
			this.value[t].makeDisplay(buffer,x|(t&4)>>>2<<depth,y|(t&2)>>>1<<depth,z|(t&1)<<depth,depth);
		}
	} else {
/*		if (!settings.veiwMode) {
			this.displayTextureCube(buffer,x,y,z,depth);
		} else if (settings.veiwMode == 4) {
			this.displayColorCubeWithNormals(buffer,x,y,z,depth);
		} else {
			this.displayColorCube(buffer,x,y,z,depth);
		}
*/		renderer.buffercube(buffer,x,y,z,depth,this);
	}
}


Octree.prototype.displayColorCube = function(buffer,x,y,z,depth) { //TODO set up colors
	var s = 1<<depth;
	var colorR = cubes[this.value-1].colorR;
	var colorG = cubes[this.value-1].colorG;
	var colorB = cubes[this.value-1].colorB;
		
	//CUBE_NORTH
	var n = this.findUpTree(x,y,z-1,x,y,z,depth,depth);
	if (!n || n instanceof Array) {
		buffer.push(x+s); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
	}
		
	//CUBE_SOUTH
	var n = this.findUpTree(x,y,z+s,x,y,z,depth,depth);
	if (!n || n instanceof Array) {
		buffer.push(x); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
	}
		
	//CUBE_DOWN
	var n = this.findUpTree(x,y-1,z,x,y,z,depth,depth);
	if (!n || n instanceof Array) {
		buffer.push(x); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
	}
	
	//CUBE_UP
	var n = this.findUpTree(x,y+s,z,x,y,z,depth,depth);
	if (!n || n instanceof Array) {
		buffer.push(x); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
	}
	
	//CUBE_WEST
	var n = this.findUpTree(x-1,y,z,x,y,z,depth,depth);
	if (!n || n instanceof Array) {
		buffer.push(x); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
	}
	
	//CUBE_EAST
	var n = this.findUpTree(x+s,y,z,x,y,z,depth,depth);
	if (!n || n instanceof Array) {
		buffer.push(x+s); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(x+s); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
	}
}

Octree.prototype.displayColorCubeWithNormals = function(buffer,x,y,z,depth) { //TODO set up colors
	var s = 1<<depth;
	var colorR = cubes[this.value-1].colorR;
	var colorG = cubes[this.value-1].colorG;
	var colorB = cubes[this.value-1].colorB;
		
	//CUBE_NORTH
	var n = this.findUpTree(x,y,z-1,x,y,z,depth,depth);
	if (!n || n instanceof Array) {
		buffer.push(x+s); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,0.0,-1.0);
		buffer.push(x); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,0.0,-1.0);
		buffer.push(x); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,0.0,-1.0);
		buffer.push(x); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,0.0,-1.0);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,0.0,-1.0);
		buffer.push(x+s); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,0.0,-1.0);
	}
		
	//CUBE_SOUTH
	var n = this.findUpTree(x,y,z+s,x,y,z,depth,depth);
	if (!n || n instanceof Array) {
		buffer.push(x); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,0.0,1.0);
		buffer.push(x+s); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,0.0,1.0);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,0.0,1.0);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,0.0,1.0);
		buffer.push(x); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,0.0,1.0);
		buffer.push(x); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,0.0,1.0);
	}
		
	//CUBE_DOWN
	var n = this.findUpTree(x,y-1,z,x,y,z,depth,depth);
	if (!n || n instanceof Array) {
		buffer.push(x); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,-1.0,0.0);
		buffer.push(x+s); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,-1.0,0.0);
		buffer.push(x+s); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,-1.0,0.0);
		buffer.push(x+s); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,-1.0,0.0);
		buffer.push(x); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,-1.0,0.0);
		buffer.push(x); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,-1.0,0.0);
	}
	
	//CUBE_UP
	var n = this.findUpTree(x,y+s,z,x,y,z,depth,depth);
	if (!n || n instanceof Array) {
		buffer.push(x); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,1.0,0.0);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,1.0,0.0);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,1.0,0.0);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,1.0,0.0);
		buffer.push(x); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,1.0,0.0);
		buffer.push(x); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(0.0,1.0,0.0);
	}
	
	//CUBE_WEST
	var n = this.findUpTree(x-1,y,z,x,y,z,depth,depth);
	if (!n || n instanceof Array) {
		buffer.push(x); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(-1.0,0.0,0.0);
		buffer.push(x); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(-1.0,0.0,0.0);
		buffer.push(x); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(-1.0,0.0,0.0);
		buffer.push(x); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(-1.0,0.0,0.0);
		buffer.push(x); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(-1.0,0.0,0.0);
		buffer.push(x); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(-1.0,0.0,0.0);
	}
	
	//CUBE_EAST
	var n = this.findUpTree(x+s,y,z,x,y,z,depth,depth);
	if (!n || n instanceof Array) {
		buffer.push(x+s); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(1.0,0.0,0.0);
		buffer.push(x+s); buffer.push(y); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(1.0,0.0,0.0);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(1.0,0.0,0.0);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(1.0,0.0,0.0);
		buffer.push(x+s); buffer.push(y+s); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(1.0,0.0,0.0);
		buffer.push(x+s); buffer.push(y); buffer.push(z+s);
		buffer.push(colorR); buffer.push(colorG); buffer.push(colorB);
		buffer.push(1.0,0.0,0.0);
	}
}

Octree.prototype.displayTextureCube = function(buffer,x,y,z,depth) {
	var s = 1<<depth;
	var tex = texSize * (this.value-1);
		
	//CUBE_NORTH
	for (var i=0; i<s; i++) {
		for (var j=0; j<s; j++) {
			var n = this.findUpTree(x+i,y+j,z-1,x,y,z,depth);
			if (!n) {
				buffer.push(x+i+1); buffer.push(y+j); buffer.push(z);
				buffer.push(tex+texSize);	buffer.push(0.0); //buffer.push(0.0);
				buffer.push(x+i); buffer.push(y+j); buffer.push(z);
				buffer.push(tex); buffer.push(0.0); //buffer.push(0.0);
				buffer.push(x+i); buffer.push(y+j+1); buffer.push(z);
				buffer.push(tex); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+i); buffer.push(y+j+1); buffer.push(z);
				buffer.push(tex); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+i+1); buffer.push(y+j+1); buffer.push(z);
				buffer.push(tex+texSize); 	buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+i+1); buffer.push(y+j); buffer.push(z);
				buffer.push(tex+texSize); buffer.push(0.0); //buffer.push(0.0);
			}
		}
	}
		
	//CUBE_SOUTH
	for (var i=0; i<s; i++) {
		for (var j=0; j<s; j++) {
			var n = this.findUpTree(x+i,y+j,z+s,x,y,z,depth);
			if (!n) {
				buffer.push(x+i); buffer.push(y+j); buffer.push(z+s);
				buffer.push(tex+texSize); buffer.push(0.0); //buffer.push(0.0);
				buffer.push(x+i+1); buffer.push(y+j); buffer.push(z+s);
				buffer.push(tex); buffer.push(0.0); //buffer.push(0.0);
				buffer.push(x+i+1); buffer.push(y+j+1); buffer.push(z+s);
				buffer.push(tex); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+i+1); buffer.push(y+j+1); buffer.push(z+s);
				buffer.push(tex); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+i); buffer.push(y+j+1); buffer.push(z+s);
				buffer.push(tex+texSize); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+i); buffer.push(y+j); buffer.push(z+s);
				buffer.push(tex+texSize); buffer.push(0.0); //buffer.push(0.0);
			}
		}
	}
		
	//CUBE_DOWN
	for (var i=0; i<s; i++) {
		for (var j=0; j<s; j++) {
			var n = this.findUpTree(x+i,y-1,z+j,x,y,z,depth);
			if (!n) {
				buffer.push(x+i); buffer.push(y); buffer.push(z+j);
				buffer.push(tex+texSize); buffer.push(0.0); //buffer.push(0.0);
				buffer.push(x+i+1); buffer.push(y); buffer.push(z+j);
				buffer.push(tex); buffer.push(0.0); //buffer.push(0.0);
				buffer.push(x+i+1); buffer.push(y); buffer.push(z+j+1);
				buffer.push(tex); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+i+1); buffer.push(y); buffer.push(z+j+1);
				buffer.push(tex); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+i); buffer.push(y); buffer.push(z+j+1);
				buffer.push(tex+texSize); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+i); buffer.push(y); buffer.push(z+j);
				buffer.push(tex+texSize); buffer.push(0.0); //buffer.push(0.0);
			}
		}
	}
	
	//CUBE_UP
	for (var i=0; i<s; i++) {
		for (var j=0; j<s; j++) {
			var n = this.findUpTree(x+i,y+s,z+j,x,y,z,depth);
			if (!n) {
				buffer.push(x+i); buffer.push(y+s); buffer.push(z+j+1);
				buffer.push(tex+texSize); buffer.push(0.0); //buffer.push(0.0);
				buffer.push(x+i+1); buffer.push(y+s); buffer.push(z+j+1);
				buffer.push(tex); buffer.push(0.0); //buffer.push(0.0);
				buffer.push(x+i+1); buffer.push(y+s); buffer.push(z+j);
				buffer.push(tex); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+i+1); buffer.push(y+s); buffer.push(z+j);
				buffer.push(tex); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+i); buffer.push(y+s); buffer.push(z+j);
				buffer.push(tex+texSize); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+i); buffer.push(y+s); buffer.push(z+j+1);
				buffer.push(tex+texSize); buffer.push(0.0); //buffer.push(0.0);
			}
		}
	}
	
	//CUBE_WEST
	for (var i=0; i<s; i++) {
		for (var j=0; j<s; j++) {
			var n = this.findUpTree(x-1,y+i,z+j,x,y,z,depth);
			if (!n) {
				buffer.push(x); buffer.push(y+i); buffer.push(z+j);
				buffer.push(tex+texSize); buffer.push(0.0); //buffer.push(0.0);
				buffer.push(x); buffer.push(y+i); buffer.push(z+j+1);
				buffer.push(tex); buffer.push(0.0); //buffer.push(0.0);
				buffer.push(x); buffer.push(y+i+1); buffer.push(z+j+1);
				buffer.push(tex); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x); buffer.push(y+i+1); buffer.push(z+j+1);
				buffer.push(tex); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x); buffer.push(y+i+1); buffer.push(z+j);
				buffer.push(tex+texSize); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x); buffer.push(y+i); buffer.push(z+j);
				buffer.push(tex+texSize); buffer.push(0.0); //buffer.push(0.0);
			}
		}
	}
	
	//CUBE_EAST
	for (var i=0; i<s; i++) {
		for (var j=0; j<s; j++) {
			var n = this.findUpTree(x+s,y+i,z+j,x,y,z,depth);
			if (!n) {
				buffer.push(x+s); buffer.push(y+i); buffer.push(z+j+1);
				buffer.push(tex+texSize); buffer.push(0.0); //buffer.push(0.0);
				buffer.push(x+s); buffer.push(y+i); buffer.push(z+j);
				buffer.push(tex); buffer.push(0.0); //buffer.push(0.0);
				buffer.push(x+s); buffer.push(y+i+1); buffer.push(z+j);
				buffer.push(tex); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+s); buffer.push(y+i+1); buffer.push(z+j);
				buffer.push(tex); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+s); buffer.push(y+i+1); buffer.push(z+j+1);
				buffer.push(tex+texSize); buffer.push(1.0); //buffer.push(0.0);
				buffer.push(x+s); buffer.push(y+i); buffer.push(z+j+1);
				buffer.push(tex+texSize); buffer.push(0.0); //buffer.push(0.0);
			}
		}    		
	}
}
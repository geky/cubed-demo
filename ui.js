var settings = {
		nearVeiw : 0.5,
		fovy : 45,
		veiwMode: 4,
		save:true,
		showGUI:true,
		showFPS:true,
		render: 2,
		geometry: 2,
		cull: 1,
		shade: true,
		ao : true,
	};

var gui = {
	xRatio : 7.0/1024.0,
	yRatio : 5.0/16.0,
	width : 7,
	height : 11,
		
	squareSize : 24,
	border : 4,
	
	stringBuffer : new Array(),
	squareBuffer : new Array(),

	init : function() {
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
		
		gui.pMat = mat4.create(),
		gui.mMat = mat4.create(),
		
		gui.texture = gl.createTexture();
		gui.buffer = gl.createBuffer();
		
		gui.image = new Image();
		gui.image.onload = function() {	
			gl.bindTexture(gl.TEXTURE_2D, gui.texture);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, gui.image);
			gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		}

		gui.image.src = "Font.png";
	},
	
	setMatrices : function() {
		mat4.ortho(0.0, gl.veiwWidth, 0.0, gl.veiwHeight, -1.0, 1.0, gui.pMat);
		mat4.identity(gui.mMat);
	},
	
	bufferString : function(x,y,size,string,hovered,border) {
	
		if (hovered) {
			if (!border) border = 0;//hi :d
			this.bufferSquare(hovered,hovered,hovered,x-border,y-border+size,gui.width*size*string.length+2*border,gui.height*size-size+2*border);
		}
	
		for (var t=0; t<string.length; t++) {
			var ch = string.charCodeAt(t) - 32;
			if (ch > 0 && ch < 95) {
				this.stringBuffer.push(x,y);
				this.stringBuffer.push(ch*gui.xRatio,gui.yRatio);
				this.stringBuffer.push(x+gui.width*size,y);
				this.stringBuffer.push((ch+1)*gui.xRatio,gui.yRatio);
				this.stringBuffer.push(x+gui.width*size,y+gui.height*size);
				this.stringBuffer.push((ch+1)*gui.xRatio,1.0);
				this.stringBuffer.push(x+gui.width*size,y+gui.height*size);
				this.stringBuffer.push((ch+1)*gui.xRatio,1.0);
				this.stringBuffer.push(x,y+gui.height*size);
				this.stringBuffer.push(ch*gui.xRatio,1.0);
				this.stringBuffer.push(x,y);
				this.stringBuffer.push(ch*gui.xRatio,gui.yRatio);
			}
			
			x += gui.width*size;
		}
	},
	
	bufferSquare : function(cr,cg,cb,tx,ty,sizex,sizey) {
		if (!sizey)
			sizey = sizex;

		this.squareBuffer.push(tx, ty);
		this.squareBuffer.push(cr,cg,cb);
		this.squareBuffer.push(tx+sizex, ty);
		this.squareBuffer.push(cr,cg,cb);
		this.squareBuffer.push(tx+sizex, ty+sizey);
		this.squareBuffer.push(cr,cg,cb);
		this.squareBuffer.push(tx+sizex, ty+sizey);
		this.squareBuffer.push(cr,cg,cb);
		this.squareBuffer.push(tx, ty+sizey);
		this.squareBuffer.push(cr,cg,cb);
		this.squareBuffer.push(tx, ty);
		this.squareBuffer.push(cr,cg,cb);
	},
	
	draw : function() {	
		gl.disable(gl.DEPTH_TEST);
		gui.setMatrices();
	
		gl.useProgram(colorShader);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, gui.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.squareBuffer), gl.STREAM_DRAW);
		gl.vertexAttribPointer(colorShader.position, 2, gl.FLOAT, false, 4*5, 0);
		gl.vertexAttribPointer(colorShader.color, 3, gl.FLOAT, false, 4*5, 2*4);
		
		gl.uniformMatrix4fv(colorShader.pMatrixUniform, false, gui.pMat);
		gl.uniformMatrix4fv(colorShader.mMatrixUniform, false, gui.mMat);
		
		gl.drawArrays(gl.TRIANGLES, 0, this.squareBuffer.length/5);
		
		
		gl.useProgram(texShader);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, gui.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.stringBuffer), gl.STREAM_DRAW);
		gl.vertexAttribPointer(texShader.position, 2, gl.FLOAT, false, 4*4, 0);
		gl.vertexAttribPointer(texShader.texCoord, 2, gl.FLOAT, false, 4*4, 2*4);		
		
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, gui.texture);
		gl.uniform1i(texShader.samplerUniform, 0);
		
		gl.uniformMatrix4fv(texShader.pMatrixUniform, false, gui.pMat);
		gl.uniformMatrix4fv(texShader.mMatrixUniform, false, gui.mMat);
		
		gl.drawArrays(gl.TRIANGLES, 0, this.stringBuffer.length/4);
		
		
		gl.enable(gl.DEPTH_TEST);
		
		this.stringBuffer.length = 0;
		this.squareBuffer.length = 0;
	}
};

var ui = {
	size : 1,
	valuel: 4,
	valuer: 0,
	leftClicks: 0,
	rightClicks:0,
	
	menu : {
		width : 140,
		height : 40,
	
		selected : false,
		active : 0,
	
		select : function() {
			this.selected = false;
			var ret = false;
		
			if (ui.x < this.width+gui.border && ui.y < this.height+gui.border) {
				this.active |= 0x01;
				ret = true;
			} else {
				this.active &= 0xFE;
			}
			
			if (!(this.active & 0x2)) return ret;
			
			var m = this.menu;
			var dep = gui.border*4 + this.height;
			var shf = gui.border*3;
			
			while (true) {
				var nextM = false;
				var nextDep = 0;
				var maxWidth = 0;
			
				for (var t=0; t<m.length; t++) {
					dep += gui.border*2 + gui.height*2 + 8;				
				
					if (ui.x > shf && ui.x < shf+m[t].name.length*gui.width*2+8 && ui.y < dep && ui.y > dep-(gui.height*2+8)) {
						m[t].active |= 0x1;
						this.selected = m[t];
						ret = true;
					} else {
						m[t].active &= 0xFE;
					}
					
					if (m[t].name.length > maxWidth)
						maxWidth = m[t].name.length;
					
					if (m[t].active & 0x2) {
						nextM = m[t].menu;
						nextDep = dep;
					}
				}
				
				if (nextM) {
					m = nextM;
					dep = nextDep - (gui.border*2 + gui.height*2 + 8);
					shf += maxWidth*gui.width*2 + 4*gui.border+8;
				} else {
					break;
				}
			}
			
			return ret;
		},
		
		draw : function() {	
		
			gui.bufferString(gui.border,gl.veiwHeight-(4*gui.height+gui.border),4,"Cubed",this.active&0x1 ? 0.5 : this.active&0x2 ? 0.25 : 0.0);
			if (!(this.active & 0x2)) return;
			
			var m = this.menu;
			var dep = gui.border*4 + this.height;
			var shf = gui.border*3;
			
			gui.bufferSquare(0.25,0.25,0.25,shf-(gui.border*2),gl.veiwHeight-(dep+gui.border*4),gui.border*2,gui.border*7);
			
			while (true) {
			
				var nextM = false;
				var nextActive = 0;
				var nextDep = 0;
				var maxWidth = 0;
				
				for (var t=0; t<m.length; t++) {
					dep += gui.border*2 + gui.height*2 + 8;
					gui.bufferString(shf+4,gl.veiwHeight-(dep)+2,2,m[t].name,m[t].active & 0x1 ? 0.5 : 0.25,4);
					
					if (m[t].name.length > maxWidth)
						maxWidth = m[t].name.length;
					
					if (m[t].active & 0x2) {
						nextM = m[t].menu;
						nextActive = m[t].active & 0x1 ? 0.5 : 0.25;
						nextDep = dep;
					}
				}
				
				gui.bufferSquare(0.25,0.25,0.25,shf-(gui.border*2),gl.veiwHeight-(dep),gui.border*2,(gui.border*2+gui.height*2+8) * m.length - (gui.border*2+2));
				
				if (nextM) {
					dep = nextDep;
					
					gui.bufferSquare(nextActive,nextActive,nextActive,shf,gl.veiwHeight-(dep),maxWidth*gui.width*2+4*gui.border+8,gui.height*2+6);
					
					m=nextM;
					dep -= (gui.border*2 + gui.height*2 + 8);
					shf += maxWidth*gui.width*2 + 4*gui.border + 8;
				} else {
					break;
				}	
			}
			
			dep -= (gui.border*2+gui.height*2 + 8) * m.length;
			
			for (var t=0; t<m.length; t++) {
				dep += gui.border*2 + gui.height*2 + 8;
				if (m[t].value)
					gui.bufferString(shf + m[t].name.length*gui.width*2 + gui.border*3 + 2,gl.veiwHeight-(dep)+2,2,m[t].value);
			}			
		},
		
		drawSelection : function() {
		
		},
		
		update : function(m) {
			if (m) {
				for (var t=0; t<m.length; t++) {
					if (m[t].update) m[t].update();
					if (m[t].menu) this.update(m[t].menu);
				}
			} else {
				this.update(this.menu);
			}	
		},
		
		click : function() {
			if (this.selected) {
				if (this.selected.click) {
					this.selected.click();
				} else if (this.selected.menu) {
					this.selected.active ^= 0x2;
				}
			} else {
				this.active ^= 0x02;
			}
		},
		
		menu : [
			{	
				name : "Settings",
				active : 0,
				menu : [
					{
						name : "Geometry",
						active:0,
						update:function() {
							switch (settings.geometry) {
								case 0 : this.value = "Points"; break;
								case 1 : this.value = "Billboards"; break;
								case 2 : this.value = "Cubes"; break;
							}
						},
						click:function(){
							settings.geometry = (settings.geometry+1) % 3;
							this.update();
							updateRenderer();
							updateBuffers();
							cookieHandler.setSettings();
						},
						value:"Cubes"
					},
					
					{
						name : "Render",
						active:0,
						update:function() {
							switch (settings.render) {
								case 0 : this.value = "Points"; break;
								case 1 : this.value = "Wireframe"; break;
								case 2 : this.value = "Solid"; break;
							}
						},
						click:function(){
							settings.render = (settings.render+1) % 3;
							this.update();
							updateRenderer();
							updateBuffers();
							cookieHandler.setSettings();
						},
						value:"Solid"
					},
					
					{
						name : "Culling",
						active:0,
						update:function() {
							switch (settings.cull) {
								case 0 : this.value = "None"; break;
								case 1 : this.value = "Rough"; break;
								case 2 : this.value = "Exact"; break;
							}
						},
						click:function(){
							settings.cull = (settings.cull+1) % 3;
							this.update();
							updateRenderer();
							updateBuffers();
							cookieHandler.setSettings();
						},
						value:"Solid"
					},
					
					{
						name : "Light Diffusion",
						active:0,
						value:"On",
						update:function() {
							this.value = settings.shade ? "On" : "Off";
						},
						click:function() {
							settings.shade = !settings.shade;
							this.update();
							updateRenderer();
							updateBuffers();
							cookieHandler.setSettings();
						}
					},
					
					{
						name : "Ambient Occulsion",
						active:0,
						value:"On",
						update:function() {
							this.value = settings.ao ? "On" : "Off";
						},
						click:function() {
							settings.ao = !settings.ao;
							this.update();
							updateRenderer();
							updateBuffers();
							cookieHandler.setSettings();
						},
					},
					
					{
						name : "Save State",
						active:0,
						value:"On",
						update:function() {
							this.value = settings.save ? "On" : "Off";
						},
						click:function() {
							settings.save = !settings.save;
							this.update();
							cookieHandler.setSettings();
						}
					},
					
					{
						name : "Show GUI",
						active:0,
						value:"On",
						update:function() {
							this.value = settings.showGUI ? "On" : "Off";
						},
						click:function() {
							settings.showGUI = !settings.showGUI;
							this.update();
							cookieHandler.setSettings();
						}
					},
					
					{
						name : "Show FPS",
						active:0,
						value:"On",
						update:function() {
							this.value = settings.showFPS ? "On" : "Off";
						},
						click:function() {
							settings.showFPS = !settings.showFPS;
							this.update();
							cookieHandler.setSettings();
						},
					},
				]
			},
			
			{
				name : "Reset",
				active : 0,
				click : function() {
					cookieHandler.clearSettings();
					window.location.href = "/cubed";
				}
			},
			
			{
				name : "About",
				active : 0,
				click : function() {
					window.location.href = "../aboutcube";
				}
			},
		]
	},
	
	pallet : {
		width : (2*(gui.squareSize+gui.border)),
		height : (((cubes.length+1)>>>1)*(gui.squareSize+gui.border)),
		
		select : function() {				
			if (ui.x < (gl.veiwWidth - this.width) || ui.y > this.height) {
				this.pallet = -1;
				return false;
			}
			
			var sizeT = gui.border + gui.squareSize;
			var x = ui.x - (gl.veiwWidth - this.width);
			var y = this.height - ui.y;
			x = ~~(x/sizeT);
			y = ~~(y/sizeT);
			
			this.pallet = (y*2)+x;
			
			return true;
		},
		
		draw : function() {		
			var sizeT = gui.border + gui.squareSize;
			var x = gl.veiwWidth - this.width;
			var y = gl.veiwHeight - this.height;
			
			gui.bufferSquare(
				0.25,
				0.25,
				0.25,
				x+((ui.valuer%2)*sizeT)-gui.border/2,
				y+((ui.valuer>>>1)*sizeT)-gui.border/2,
				sizeT
			);
			
			if (this.pallet >= 0) {			
				gui.bufferSquare(
					0.5,
					0.5,
					0.5,
					x+((this.pallet%2)*sizeT)-gui.border/2,
					y+((this.pallet>>>1)*sizeT)-gui.border/2,
					sizeT
				);
			}
			
			gui.bufferSquare(
				1.0,
				1.0,
				1.0,
				x+((ui.valuel%2)*sizeT)-gui.border/2,
				y+((ui.valuel>>>1)*sizeT)-gui.border/2,
				sizeT
			);
				
			for (var t=0; t<cubes.length; t++) {			
				gui.bufferSquare(
					cubes[t].colorR,
					cubes[t].colorG,
					cubes[t].colorB,
					x+(((t+1)%2)*sizeT), 
					y+(((t+1)>>>1)*sizeT),
					gui.squareSize
				);
			}
			
			gui.bufferString(x-gui.border/2,y-(gui.border/2 + 4),4,"x");
			gui.bufferSquare(0.128,0.128,0.128,x,y,gui.squareSize);
		},
		
		drawSelection : function() {
			
		},
		
		click : function(left) {
			if (left)
				ui.valuel = this.pallet;
			else 
				ui.valuer = this.pallet;
		}
	},
	
	chooser : {
		select : function() {
			var temp = mat4.create();
			var pos = vec3.create();
			var dir = vec3.create();
			
			mat4.inverse(mMatrix,temp);
			mat4.multiplyVec3(temp,[0.0,0.0,0.0],pos);
			
			vec3.set([ui.xLookRatio * (ui.x/gl.veiwWidth - 0.5), ui.yLookRatio * (0.5 - ui.y/gl.veiwHeight), -settings.nearVeiw],dir);
			mat4.set(rotMatrix,temp);
			mat4.inverse(temp);
			mat4.multiplyVec3(temp,dir);
			vec3.normalize(dir);
			
			this.hit = octree.raycast(pos[0],pos[1],pos[2],dir[0],dir[1],dir[2],octree.depth);
			if (!this.hit)
				return false;
			
			vec3.scale(dir,this.hit.t);
			vec3.add(dir,pos);
			vec3.set(dir,pos);
			
			this.pos0 = pos; //these are identical but will be slightly altered below
			this.pos1 = dir;		

			var sel = new Array();
			var offset = this.hit.face&8 ? 0.03125 : -0.03125;
			sel.dim = 1<<(ui.size); //>
			sel.mask = ~(sel.dim-1);
			
			if (this.hit.face & 4) {
				var x = pos[0] + offset;
				var y = pos[1] & sel.mask;
				var z = pos[2] & sel.mask;
				sel.push(x,y,z);
				sel.push(1.0,1.0,1.0);
				sel.push(x,y,z+sel.dim);
				sel.push(1.0,1.0,1.0);
				sel.push(x,y+sel.dim,z+sel.dim);
				sel.push(1.0,1.0,1.0);
				sel.push(x,y+sel.dim,z);
				sel.push(1.0,1.0,1.0);
				
				this.pos0[0] -= offset;
				this.pos1[0] += offset;
			} else if (this.hit.face & 2) {
				var x = pos[0] & sel.mask;
				var y = pos[1] + offset;
				var z = pos[2] & sel.mask;
				sel.push(x,y,z);
				sel.push(1.0,1.0,1.0);
				sel.push(x,y,z+sel.dim);
				sel.push(1.0,1.0,1.0);
				sel.push(x+sel.dim,y,z+sel.dim);
				sel.push(1.0,1.0,1.0);
				sel.push(x+sel.dim,y,z);
				sel.push(1.0,1.0,1.0);
				
				this.pos0[1] -= offset;
				this.pos1[1] += offset;
			} else {
				var x = pos[0] & sel.mask;
				var y = pos[1] & sel.mask;
				var z = pos[2] + offset;
				sel.push(x,y,z);
				sel.push(1.0,1.0,1.0);
				sel.push(x,y+sel.dim,z);
				sel.push(1.0,1.0,1.0);
				sel.push(x+sel.dim,y+sel.dim,z);
				sel.push(1.0,1.0,1.0);
				sel.push(x+sel.dim,y,z);
				sel.push(1.0,1.0,1.0);
				
				this.pos0[2] -= offset;
				this.pos1[2] += offset 
			}
			
			gl.bindBuffer(gl.ARRAY_BUFFER, ui.selectBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sel), gl.STREAM_DRAW);
			
			return true;
		},
		
		drawSelection : function() {
			gl.useProgram(colorShader);
			
			gl.bindBuffer(gl.ARRAY_BUFFER, ui.selectBuffer);
			gl.vertexAttribPointer(colorShader.position, 3, gl.FLOAT, false, 6*4, 0);
			gl.vertexAttribPointer(colorShader.color, 3, gl.FLOAT, false, 6*4, 3*4);
			
			gl.uniformMatrix4fv(colorShader.pMatrixUniform, false, pMatrix);
			gl.uniformMatrix4fv(colorShader.mMatrixUniform, false, mMatrix);
			
			gl.drawArrays(gl.LINE_LOOP, 0, 4);
		},

		click : function(left) {			
			var val = left ? ui.valuel : ui.valuer;

			if (val) {
			
				var len = 1<<octree.depth;

				if (this.pos1[0] < 0 || this.pos1[1] < 0 || this.pos1[2] < 0) { //>
					this.pos1[0] += len;
					this.pos1[1] += len;
					this.pos1[2] += len;
					
					var temp = octree;
					octree = new Octree(0);
					octree.split(0);
					octree.depth = temp.depth+1;
					delete temp.depth;
					delete temp.pos;
					delete temp.rad;
					octree.value[7] = temp;
					temp.origin = octree;
				}
					
				if (this.pos1[0] >= len || this.pos1[1] >= len || this.pos1[2] >= len) {
					var temp = octree;
					octree = new Octree(0);
					octree.split(0);
					octree.depth = temp.depth+1;
					delete temp.depth;
					delete temp.pos;
					delete temp.rad;
					octree.value[0] = temp;
					temp.origin = octree;
				}

				octree.set(this.pos1[0],this.pos1[1],this.pos1[2],octree.depth,ui.size,val);
			} else {
			
				octree.set(this.pos0[0],this.pos0[1],this.pos0[2],octree.depth,ui.size,val);
				
				var only = octree.getOnlyChild();
				while (only) {
					only.depth = octree.depth-1;
					delete only.origin;
					octree = only;
					only = octree.getOnlyChild();
				}
			}
			
			updateBuffers();
		}
	},
	

	init : function() {
	
		ui.selectBuffer = gl.createBuffer();
	
		window.onresize = function() {
			gl.veiwWidth = canvas.width = window.innerWidth;
			gl.veiwHeight = canvas.height = window.innerHeight;
			ui.xRatio = Math.PI/gl.veiwWidth;
			ui.yRatio = Math.PI/gl.veiwHeight;
			
			ui.yLookRatio = 2 * settings.nearVeiw * Math.tan(settings.fovy*Math.PI / 360.0);
			ui.xLookRatio = ui.yLookRatio * gl.veiwWidth/gl.veiwHeight;
			
			gl.viewport(0, 0, gl.veiwWidth, gl.veiwHeight);
		}
		window.onresize();

		document.onmousedown = function(event) {
			if (ui.control || (event.which != 3 && event.which != 1)) {
				ui.dragged = true;
			}				
		}

		document.onmouseup = function(event) {
			if (ui.dragged) {
				ui.dragged = false;
			} else {
				if (event.which == 3) {
					ui.rightClicks++;
				} else if (event.which == 1) {
					ui.leftClicks++;
				}
			}
		}

		document.onmousemove = function(event) {
			ui.x = event.clientX;
			ui.y = event.clientY;
		}

		document.onkeydown = function(event) {
			switch (event.keyCode) {
				case 87 : case 38 : ui.up = true; break;
				case 83 : case 40 : ui.down = true; break;
				case 68 : case 39 : ui.right = true; break;
				case 65 : case 37 : ui.left = true; break;
				case 16 : case 17 : ui.control = true; break;
				case 18 : ui.alt = true; break;
			}
		}

		document.onkeyup = function(event) {
			switch (event.keyCode) {
				case 87 : case 38 : ui.up = false; break;
				case 83 : case 40 : ui.down = false; break;
				case 68 : case 39 : ui.right = false; break;
				case 65 : case 37 : ui.left = false; break;
				case 16 : case 17 : ui.control = false; break;
				case 18 : ui.alt = false; break;
				//case 81 : settings.veiwMode = ++settings.veiwMode % 5; updateBuffers(); break;
				
				case 27 : ui.menu.active ^= 0x2; break;
				
				case 192: if (!ui.control) {ui.valuel = ui.valuel!=0 ? 0 :1 } else {ui.valuer = ui.valuer!=0 ? 0 :1 }; break;
				case 49 : if (!ui.control) {ui.valuel = ui.valuel!=2 ? 2 :3 } else {ui.valuer = ui.valuer!=2 ? 2 :3 }; break;
				case 50 : if (!ui.control) {ui.valuel = ui.valuel!=4 ? 4 :5 } else {ui.valuer = ui.valuer!=4 ? 4 :5 }; break;
				case 51 : if (!ui.control) {ui.valuel = ui.valuel!=6 ? 6 :7 } else {ui.valuer = ui.valuer!=6 ? 6 :7 }; break;
				case 52 : if (!ui.control) {ui.valuel = ui.valuel!=8 ? 8 :9 } else {ui.valuer = ui.valuer!=8 ? 8 :9 }; break;
				case 53 : if (!ui.control) {ui.valuel = ui.valuel!=10? 10:11} else {ui.valuer = ui.valuer!=10? 10:11}; break;
				case 54 : if (!ui.control) {ui.valuel = ui.valuel!=12? 12:13} else {ui.valuer = ui.valuer!=12? 12:13}; break;
				case 55 : if (!ui.control) {ui.valuel = ui.valuel!=14? 14:15} else {ui.valuer = ui.valuer!=14? 14:15}; break;
				case 56 : if (!ui.control) {ui.valuel = ui.valuel!=16? 16:17} else {ui.valuer = ui.valuer!=16? 16:17}; break;
				case 57 : if (!ui.control) {ui.valuel = ui.valuel!=18? 18:19} else {ui.valuer = ui.valuer!=18? 18:19}; break;
				case 48 : if (!ui.control) {ui.valuel = ui.valuel!=20? 20:21} else {ui.valuer = ui.valuer!=20? 20:21}; break;
				
				case 109: case 189 : case 81 : ui.size--; if (ui.size < 0) ui.size = 0; break;
				case 107: case 187 : case 69 : ui.size++; break;
			}
		}
		
		document.onmousewheel = function(event){
			var delta = 0;
			if (!event) event = window.event;
					
			if (event.wheelDelta) { 
					delta = event.wheelDelta/120;
			} else if (event.detail) {
					delta = -event.detail/3;
			}
			
			if (delta) {
				if (!ui.control) {
					ui.valuel += delta;
					if (ui.valuel < 0) ui.valuel = 0;
					if (ui.valuel >= cubes.length) ui.valuel = cubes.length;
				} else {
					zoom -= octree.rad*delta;
				}
			}
					
			if (event.preventDefault) event.preventDefault();
			event.returnValue = false;
		}
		
		window.onhashchange = function() {
			octree = hashHandler.getOctree();
			updateBuffers();
		}
		
		gui.init();
	},
	
	handleActions : function(dt) {
		if (ui.up)
			zoom -= 4 * dt * octree.rad;
		if (ui.down)
			zoom += 4 * dt * octree.rad;
		if (ui.left)
			mat4.rotate(rotMatrix,-Math.PI*dt,[0,1,0]);
		if (ui.right)
			mat4.rotate(rotMatrix,Math.PI*dt,[0,1,0]);

		if (ui.dragged) {	
			var dx = ui.x - ui.oldX;
			var dy = ui.y - ui.oldY;

			var tempRot = mat4.create();
			mat4.identity(tempRot);
			mat4.rotate(tempRot, dx * ui.xRatio, [0, 1, 0]);
			mat4.rotate(tempRot, dy * ui.yRatio, [1, 0, 0]);
			mat4.multiply(tempRot, rotMatrix, rotMatrix);
		}

		ui.oldX = ui.x;
		ui.oldY = ui.y;
				
		if (ui.leftClicks) {
			if (ui.hit)
				ui.hit.click(true);

			ui.leftClicks--;
		}

		if (ui.rightClicks) {
			if (ui.hit)
				ui.hit.click(false);
			
			ui.rightClicks--;
		}
		
		setMatrices();
		
		if (ui.x < 0 || ui.y < 0 || ui.x > gl.veiwWidth || ui.y > gl.veiwHeight) {
			ui.hit = false;
		} else if (ui.menu.select()) {
			ui.hit = ui.menu;
		} else if (ui.pallet.select()) {
			ui.hit = ui.pallet;
		} else if (ui.chooser.select()) {
			ui.hit = ui.chooser;
		} else {
			ui.hit = false;
		}
	},
	
	drawGui : function(dt) {
		if (ui.hit)
			ui.hit.drawSelection();
	
		if (settings.showFPS) {
			var fps = dt>0?1.0/dt:0;
			avgFPS = (0.99*avgFPS) + (0.01*fps);
			
			gui.bufferString(0,2*gui.height,2,"FPS:" + ~~avgFPS + ":" + ~~fps);
			gui.bufferString(0,gui.height,1,"Buffer Time:" + bufferTime + "ms");
			gui.bufferString(0,0,1,"Render Time:" + ~~avgRenderTime + "ms:" + renderTime + "ms");
		}
		
		if (settings.showGUI || this.menu.active & 0x2)
			this.menu.draw();
		
		if (settings.showGUI) {
			this.pallet.draw();
			
			var temp = "Color:";
			if (ui.valuel) {
				temp += (((cubes[ui.valuel-1].colorR*0xFF)&0xFF)+0x100).toString(16).substr(1).toUpperCase();
				temp += (((cubes[ui.valuel-1].colorG*0xFF)&0xFF)+0x100).toString(16).substr(1).toUpperCase();
				temp += (((cubes[ui.valuel-1].colorB*0xFF)&0xFF)+0x100).toString(16).substr(1).toUpperCase();
			} else {
				temp += "Remove";
			}
			gui.bufferString(gl.veiwWidth-(2*gui.width*temp.length+ui.pallet.width+gui.border/2),gl.veiwHeight-(2*gui.height+gui.border/2),2,temp);
			
			temp = "Size:" + ui.size;
			gui.bufferString(gl.veiwWidth-(2*gui.width*temp.length+ui.pallet.width+gui.border/2),gl.veiwHeight-(4*gui.height+gui.border/2),2,temp);
		}
		
		gui.draw();
	}
}

var cookieHandler = {
	
	getSettings : function() {
		var cookie = document.cookie;
		
		var val = cookie.match("cubedshowGUI=(true|false)");
		if (val) settings.showGUI = "true" == val[1];
		
		val = cookie.match("cubedshowFPS=(true|false)");
		if (val) settings.showFPS = "true" == val[1];
		
		val = cookie.match("cubedgeometry=(0|1|2)");
		if (val) settings.geometry = Number(val[1]);
		
		val = cookie.match("cubedrender=(0|1|2)");
		if (val) settings.render = Number(val[1]);
		
		val = cookie.match("cubedsave=(true|false)");
		if (val) settings.save = "true" == val[1];
		
		ui.menu.update();
	},
	
	setSettings : function(days) {
		var date = new Date();
		date.setDate(date.getDate() + (days?days:2));
		
		document.cookie="cubedshowGUI=" + settings.showGUI + 
						";expires=" + date.toUTCString() + 
						";path=/cubed";
						
		document.cookie="cubedshowFPS=" + settings.showFPS + 
						";expires=" + date.toUTCString() + 
						";path=/cubed";
						
		document.cookie="cubedgeometry=" + settings.geometry + 
						";expires=" + date.toUTCString() + 
						";path=/cubed";
						
		document.cookie="cubedrender=" + settings.render + 
						";expires=" + date.toUTCString() + 
						";path=/cubed";
						
		document.cookie="cubedsave=" + settings.save + 
						";expires=" + date.toUTCString() + 
						";path=/cubed";
	},
	
	clearSettings : function() {
		cookieHandler.setSettings(-1);
	}
}

var hashHandler = {
	
	getOctree : function() {
	
		var hash = window.location.hash;
		if (!hash) {
			var tree = new Octree(3);
			tree.depth = 2;
			return tree;
		}
		
		hash = hash.split(/[#\-]/);
		
		var count = 0;
		for (var t=0; t<hash[2].length; t++) {
			var cha = hash[2].charCodeAt(t);
			if (cha >= 48 && cha <= 57) {
				count = cha - 48 + (count * 10);
			} else if (cha >= 65 && cha <= 90 || cha >= 97 && cha <= 122) {
				if (count == 0) count = 1;
				
				if (cha < 97) {
					count *= 2;
					cha += 32;
				}
				
				for (var tt=0; tt<count; tt++) {
					hash[0] += String.fromCharCode(cha);
				}
				
				count = 0;
			}
		}
		
		hash.i = 0;
		var tree = hashHandler.getOctreeFromHash(hash);
		tree.depth = parseInt(hash[1]);
		return tree;
	},

	getOctreeFromHash : function(hash) {

		if (hash[0].charAt(hash.i) == 'z') {
			hash.i++;
			var temp = new Octree(new Array(8));
			for (var t=0; t<8; t++) {
				temp.value[t] = hashHandler.getOctreeFromHash(hash);
				temp.value[t].origin = temp;
			}
			return temp;
		}
		
		return new Octree(hash[0].charCodeAt(hash.i++) - 97);
	},

	setHash : function(tree) {

		var hash = "#" + tree.depth + "-";
		var rawhash = hashHandler.setHashFromOctree(tree);
		
		for (var t=0; t<rawhash.length;) {
			var len = 1;
			var cha = rawhash.charCodeAt(t);
			while (rawhash.charCodeAt(t+len) == cha) {
				len++;
			}
			
			t += len;
			
			if (len%2 == 0) {
				cha -= 32;
				len = ~~(len/2);
			}
			
			if (len == 1) {
				hash += String.fromCharCode(cha);
			} else {
				hash += len;
				hash += String.fromCharCode(cha);
			}
		}
		
		if (window.location.hash != hash) {
			if (settings.save) {
				window.location.hash = hash;
			} else {
				location.replace(hash);
			}
		}
	},

	setHashFromOctree : function(tree) {
		if (tree.value instanceof Array) {
			var hash = "z";
			for (var t=0; t<8; t++) {
				hash += hashHandler.setHashFromOctree(tree.value[t]);
			}
			return hash;
		} else {
			return String.fromCharCode(tree.value + 97);
		}
	}
}

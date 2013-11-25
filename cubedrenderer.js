var cubes = [
	{colorR : 0.25, colorG : 0.25, colorB : 0.25},
	{colorR : 0.0, colorG : 0.0, colorB : 0.0},
	{colorR : 0.49803922, colorG : 0.49803922, colorB : 0.49803922},
	{colorR : 1.0, colorG : 1.0, colorB : 1.0},
	{colorR : 0.7647059, colorG : 0.7647059, colorB : 0.7647059},
	{colorR : 0.53333336, colorG : 0.0, colorB : 0.08235294},
	{colorR : 0.7254902, colorG : 0.47843137, colorB : 0.34117648},
	{colorR : 0.92941177, colorG : 0.10980392, colorB : 0.14117648},
	{colorR : 1.0, colorG : 0.68235296, colorB : 0.7882353},
	{colorR : 1.0, colorG : 0.49803922, colorB : 0.15294118},
	{colorR : 1.0, colorG : 0.7882353, colorB : 0.05490196},
	{colorR : 1.0, colorG : 0.9490196, colorB : 0.0},
	{colorR : 0.9372549, colorG : 0.89411765, colorB : 0.6901961},
	{colorR : 0.13333334, colorG : 0.69411767, colorB : 0.29803923},
	{colorR : 0.70980394, colorG : 0.9019608, colorB : 0.11372549},
	{colorR : 0.0, colorG : 0.63529414, colorB : 0.9098039},
	{colorR : 0.6, colorG : 0.8509804, colorB : 0.91764706},
	{colorR : 0.24705882, colorG : 0.28235295, colorB : 0.8},
	{colorR : 0.4392157, colorG : 0.57254905, colorB : 0.74509805},
	{colorR : 0.6392157, colorG : 0.28627452, colorB : 0.6431373},
	{colorR : 0.78431374, colorG : 0.7490196, colorB : 0.90588236}
];

var texShader;
var colorShader;

var renderer = {
	shader : false,
	variables : false,
	draw : false,
	buffercube : false,
};

function initShaders() {

	texShader = createShader(
		"precision mediump float;"+
		"varying vec2 vTexCoord;"+
		"uniform sampler2D uSampler;"+
		"void main(void) {"+
		"	gl_FragColor = texture2D(uSampler, vec2(vTexCoord.s, vTexCoord.t));"+
		"}"
	,
		"attribute vec3 vPos;"+
		"attribute vec2 tCoord;"+
		"uniform mat4 uMMatrix;"+
		"uniform mat4 uPMatrix;"+
		"varying vec2 vTexCoord;"+
		"void main(void) {"+
		"	gl_Position = uPMatrix * uMMatrix * vec4(vPos, 1.0);"+
		"	vTexCoord = tCoord;"+
		"}"
	);
	
	gl.useProgram(texShader);

	texShader.position = gl.getAttribLocation(texShader,"vPos");
	texShader.texCoord = gl.getAttribLocation(texShader,"tCoord");
	gl.enableVertexAttribArray(texShader.position);
	gl.enableVertexAttribArray(texShader.texCoord);

	texShader.pMatrixUniform = gl.getUniformLocation(texShader, "uPMatrix");
	texShader.mMatrixUniform = gl.getUniformLocation(texShader, "uMMatrix");
	texShader.samplerUniform = gl.getUniformLocation(texShader, "uSampler");
	
	
	colorShader = createShader(	
		"precision mediump float;"+
		"varying vec3 vColor;"+
		"void main(void) {"+
		"	gl_FragColor = vec4(vColor,1.0);"+
		"}"
	,
		"attribute vec3 vPos;"+
		"attribute vec3 vCol;"+
		"uniform mat4 uMMatrix;"+
		"uniform mat4 uPMatrix;"+
		"varying vec3 vColor;"+
		"void main(void) {"+
		"	gl_Position = uPMatrix * uMMatrix * vec4(vPos, 1.0);"+
		"	vColor = vCol;"+
		"}"
	);
	
	gl.useProgram(colorShader);

	colorShader.position = gl.getAttribLocation(colorShader,"vPos");
	gl.enableVertexAttribArray(colorShader.position);
	colorShader.color = gl.getAttribLocation(colorShader,"vCol");
	gl.enableVertexAttribArray(colorShader.color);

	colorShader.pMatrixUniform = gl.getUniformLocation(colorShader, "uPMatrix");
	colorShader.mMatrixUniform = gl.getUniformLocation(colorShader, "uMMatrix");
	
	updateRenderer();
}

function createShader(fragsrc, vertsrc, program) {

	if (!program) {
		program = gl.createProgram();
	} else {
		gl.detachShader(program, program.vertshader);
		gl.detachShader(program, program.fragshader);
		gl.deleteShader(program.vertshader);
		gl.deleteShader(program.fragshader);
	}
	
	program.fragshader = gl.createShader(gl.FRAGMENT_SHADER);
	program.vertshader = gl.createShader(gl.VERTEX_SHADER);

	gl.attachShader(program, program.vertshader);
	gl.attachShader(program, program.fragshader);
	
	gl.shaderSource(program.fragshader,fragsrc);
	gl.compileShader(program.fragshader);
	
	if (!gl.getShaderParameter(program.fragshader, gl.COMPILE_STATUS)) {
		window.alert(gl.getShaderInfoLog(program.fragshader));
		return null;
	}
	
	gl.shaderSource(program.vertshader,vertsrc);
	gl.compileShader(program.vertshader);
	
	if (!gl.getShaderParameter(program.vertshader, gl.COMPILE_STATUS)) {
		window.alert(gl.getShaderInfoLog(program.vertshader));
		return null;
	}

	gl.linkProgram(program);
	
	return program;
}

function updateRenderer() {

	renderer.helpers = {};
	
	renderer.shader = createShader(
		"precision mediump float;"+
		"varying vec3 vColor;"+
		
		"void main(void) {"+
			"	gl_FragColor = vec4(vColor,1.0);"+
		"}"
	,
		"attribute vec3 vPos;"+
		"attribute vec3 vCol;"+
		(settings.geometry == 2 ? "attribute vec3 vNorm;" : "")+
		(settings.geometry == 1 ? "attribute vec2 vOff;" : "")+
		"uniform mat4 uMMatrix;"+
		"uniform mat4 uPMatrix;"+
		(settings.geometry == 2 && settings.shade ? 
			"uniform mat3 uNMatrix;"+
			"uniform vec3 lightDir;" 
		 : "")+
		"varying vec3 vColor;"+
		
		"void main(void) {"+
			(settings.geometry == 1 ? "	gl_Position = uPMatrix * (uMMatrix * vec4(vPos, 1.0) + vec4(vOff,0.0,0.0));"
			: "	gl_Position = uPMatrix * uMMatrix * vec4(vPos, 1.0);") +
			(settings.geometry == 2 && settings.shade ? "	vColor = (vCol*0.5) + (vCol*0.5) * max(dot(uNMatrix * vNorm, lightDir), 0.0);" 
			: "	vColor = vCol;") +
		"}"
	, renderer.shader);
	
	
	
	gl.useProgram(renderer.shader);
	
	renderer.variables = {};

	renderer.variables.position = gl.getAttribLocation(renderer.shader,"vPos");
	gl.enableVertexAttribArray(renderer.variables.position);
	renderer.variables.color = gl.getAttribLocation(renderer.shader,"vCol");
	gl.enableVertexAttribArray(renderer.variables.color);
	
	if (settings.geometry == 2) {
		renderer.variables.normal = gl.getAttribLocation(renderer.shader,"vNorm");
		gl.enableVertexAttribArray(renderer.shader.normal);
	} else if (settings.geometry == 1) {
		renderer.variables.offset = gl.getAttribLocation(renderer.shader,"vOff");
		gl.enableVertexAttribArray(renderer.variables.offset);
	}

	renderer.variables.pMatrixUniform = gl.getUniformLocation(renderer.shader, "uPMatrix");
	renderer.variables.mMatrixUniform = gl.getUniformLocation(renderer.shader, "uMMatrix");	
	
	if (settings.geometry == 2 && settings.shade) {
		renderer.variables.nMatrixUniform = gl.getUniformLocation(renderer.shader, "uNMatrix");

		renderer.variables.lightDir = gl.getUniformLocation(renderer.shader, "lightDir");
	}
	
	
	var attribLen = settings.geometry == 2 ? 9 : settings.geometry == 1 ? 8 : 6;
	
	eval("renderer.draw = function() {"+
	
		"gl.useProgram(renderer.shader);"+
		
		"gl.bindBuffer(gl.ARRAY_BUFFER, treeBuffer);"+
		"gl.vertexAttribPointer(renderer.variables.position, 3, gl.FLOAT, false, "+(attribLen*4)+", 0);"+
		"gl.vertexAttribPointer(renderer.variables.color, 3, gl.FLOAT, false, "+(attribLen*4)+", 12);"+
		(settings.geometry == 2 ? "gl.vertexAttribPointer(renderer.variables.normal, 3, gl.FLOAT, false, "+(attribLen*4)+", 24);" : "")+
		(settings.geometry == 1 ? "gl.vertexAttribPointer(renderer.variables.offset, 2, gl.FLOAT, false, "+(attribLen*4)+", 24);" : "")+
		
		"gl.uniformMatrix4fv(renderer.variables.pMatrixUniform, false, pMatrix);"+
		"gl.uniformMatrix4fv(renderer.variables.mMatrixUniform, false, mMatrix);"+
		
		(settings.geometry == 2 && settings.shade ? 
			"var nMatrix = mat3.create();"+
			"mat4.toInverseMat3(mMatrix, nMatrix);"+
			"mat3.transpose(nMatrix);"+
			"gl.uniformMatrix3fv(renderer.variables.nMatrixUniform, false, nMatrix);"+
		
			"gl.uniform3fv(renderer.variables.lightDir, light);"
		: "")+
		
		"gl.drawArrays("+(settings.geometry == 0 || settings.render == 0 ? "gl.POINTS" : settings.render == 1 ? "gl.LINE_STRIP" : "gl.TRIANGLES")+", 0, treeBuffer.size/"+attribLen+");"+
		
	"}");
	
	
	var src = 
		"var s = 1<<depth;"+
		"var colorR = cubes[tree.value-1].colorR;"+
		"var colorG = cubes[tree.value-1].colorG;"+
		"var colorB = cubes[tree.value-1].colorB;";
	
	if (settings.geometry == 2) {
		
		for (var t=0; t<6; t++) {
			var x = t==4 ? -1.0 : t==5 ? 1.0 : 0.0;
			var y = t==2 ? -1.0 : t==3 ? 1.0 : 0.0;
			var z = t==0 ? -1.0 : t==1 ? 1.0 : 0.0;
			
			var data = 
				"	buffer.push(colorR,colorG,colorB);"+
				"	buffer.push("+x+","+y+","+z+");";
			
			if (settings.cull == 1) src +=
				"var n = tree.findUpTree(x"+(x<0?"-1":x>0?"+s":"")+",y"+(y<0?"-1":y>0?"+s":"")+",z"+(z<0?"-1":z>0?"+s":"")+",x,y,z,depth,depth);"+
				"if (!n || n instanceof Array) {";
				
			if (settings.cull == 2) src =
				"var s = 1<<depth0;"+
				"var colorR = cubes[tree.value-1].colorR;"+
				"var colorG = cubes[tree.value-1].colorG;"+
				"var colorB = cubes[tree.value-1].colorB;"+
				
				"var n = tree.findUpTree(x"+(x<0?"-1":x>0?"+s":"")+",y"+(y<0?"-1":y>0?"+s":"")+",z"+(z<0?"-1":z>0?"+s":"")+",x,y,z,depth,depth0);"+
				
				"if (n instanceof Array) {"+
				"	s = 1<<--depth;"+
				"	renderer.helpers["+t+"](buffer,x,y,z,depth,depth0,tree);"+
				"	renderer.helpers["+t+"](buffer,x"+(z!=0||y!=0?"+s":"")+",y,z"+(x!=0?"+s":"")+",depth,depth0,tree);"+
				"	renderer.helpers["+t+"](buffer,x,y"+(x!=0||z!=0?"+s":"")+",z"+(y!=0?"+s":"")+",depth,depth0,tree);"+
				"	renderer.helpers["+t+"](buffer,x"+(y!=0||z!=0?"+s":"")+",y"+(x!=0||z!=0?"+s":"")+",z"+(x>0||y>0?"+s":"")+",depth,depth0,tree);"+
				"} else if(!n) {"+
				"	var s2 = 1<<depth;"+
				"	buffer.push(x"+(x>0?"+s2":"")+",y"+(y>0?"+s2":"")+",z"+(z>0?"+s2":"")+");" + data +
				"	buffer.push(x"+(x>0?"+s2":z>0||y<0?"+s":"")+",y"+(y>0?"+s2":x>0||z<0?"+s":"")+",z"+(z>0?"+s2":y>0||x<0?"+s":"")+");" + data +
				"	buffer.push(x"+(x>0?"+s2":x<0?"":"+s")+",y"+(y>0?"+s2":y<0?"":"+s")+",z"+(z>0?"+s2":z<0?"":"+s")+");" + data +
				"	buffer.push(x"+(x>0?"+s2":x<0?"":"+s")+",y"+(y>0?"+s2":y<0?"":"+s")+",z"+(z>0?"+s2":z<0?"":"+s")+");" + data +
				"	buffer.push(x"+(x>0?"+s2":y>0||z<0?"+s":"")+",y"+(y>0?"+s2":z>0||x<0?"+s":"")+",z"+(z>0?"+s2":y<0||x>0?"+s":"")+");"+ data +
				"	buffer.push(x"+(x>0?"+s2":"")+",y"+(y>0?"+s2":"")+",z"+(z>0?"+s2":"")+");" + data +
				"}";
			else src += 
				"	buffer.push(x"+(x>0?"+s":"")+",y"+(y>0?"+s":"")+",z"+(z>0?"+s":"")+");" + data +
				"	buffer.push(x"+(x>0||z>0||y<0?"+s":"")+",y"+(y>0||x>0||z<0?"+s":"")+",z"+(z>0||y>0||x<0?"+s":"")+");" + data +
				"	buffer.push(x"+(x<0?"":"+s")+",y"+(y<0?"":"+s")+",z"+(z<0?"":"+s")+");" + data +
				"	buffer.push(x"+(x<0?"":"+s")+",y"+(y<0?"":"+s")+",z"+(z<0?"":"+s")+");" + data +
				"	buffer.push(x"+(x>0||y>0||z<0?"+s":"")+",y"+(y>0||z>0||x<0?"+s":"")+",z"+(z>0||y<0||x>0?"+s":"")+");"+ data +
				"	buffer.push(x"+(x>0?"+s":"")+",y"+(y>0?"+s":"")+",z"+(z>0?"+s":"")+");" + data;
				
			if (settings.cull == 1) src += "}";
			
			if (settings.cull == 2) {
				eval("renderer.helpers["+t+"] = function(buffer,x,y,z,depth,depth0,tree) {"+src+"}");
			}
		}
		
		if (settings.cull == 2) {
			src = "";
			for (var t=0; t<6; t++) {
				src += "renderer.helpers["+t+"](buffer,x,y,z,depth,depth,tree);";					
			}
		}
		
	} else if (settings.geometry == 1) {
	
		if (settings.cull == 2) {	
	
			src += "var covered = true;";
		
			for (var t=0; t<6; t++) {
				var x = t==4 ? -1.0 : t==5 ? 1.0 : 0.0;
				var y = t==2 ? -1.0 : t==3 ? 1.0 : 0.0;
				var z = t==0 ? -1.0 : t==1 ? 1.0 : 0.0;
				
				src +=
					"var n = tree.findUpTree(x"+(x<0?"-1":x>0?"+s":"")+",y"+(y<0?"-1":y>0?"+s":"")+",z"+(z<0?"-1":z>0?"+s":"")+",x,y,z,depth,depth);"+
					"if (!n || n instanceof Array) covered = false;";
			}
			
			src += "if (!covered) {";
		}
		
	
		src += "s *= 0.5;";
	
		var data = 
			"	buffer.push(x+s,y+s,z+s);"+
			"	buffer.push(colorR,colorG,colorB);";
			
		src +=
			data + "	buffer.push(-s,-s);"+
			data + "	buffer.push( s,-s);"+
			data + "	buffer.push( s, s);"+
			data + "	buffer.push( s, s);"+
			data + "	buffer.push(-s, s);"+
			data + "	buffer.push(-s,-s);";
			
			
		if (settings.cull == 2) src += "}";
			
	} else {
		
		if (settings.cull == 2) {	
	
			src += "var covered = true;";
		
			for (var t=0; t<6; t++) {
				var x = t==4 ? -1.0 : t==5 ? 1.0 : 0.0;
				var y = t==2 ? -1.0 : t==3 ? 1.0 : 0.0;
				var z = t==0 ? -1.0 : t==1 ? 1.0 : 0.0;
				
				src +=
					"var n = tree.findUpTree(x"+(x<0?"-1":x>0?"+s":"")+",y"+(y<0?"-1":y>0?"+s":"")+",z"+(z<0?"-1":z>0?"+s":"")+",x,y,z,depth,depth);"+
					"if (!n || n instanceof Array) covered = false;";
			}
			
			src += "if (!covered) {";
		}
		
		src +=
			"s *= 0.5;"+
			"	buffer.push(x+s,y+s,z+s);"+
			"	buffer.push(colorR,colorG,colorB);";
			
		if (settings.cull == 2) src += "}";
	}
	
	eval("renderer.buffercube = function(buffer,x,y,z,depth,tree) {"+src+"}");
}
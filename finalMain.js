/*
  COMP 3420 – Final Programming Exam

  This file contains the WebGL setup and drawing code for my scene based on
  the chosen reference image (gold sphere on a grey cube on a wooden floor).
  I create three shapes (sphere, cube, and a scaled cube as the floor) using
  cgIShape/myShapes, then render them with a single Phong shading program.
  The sphere and cube use different material properties (gold and grey), while
  the floor uses the wood-floor.jpg texture. One point light and a non-default
  camera position are used, and keyboard input (A/D, W/S, R) updates rotation
  and camera distance before re-drawing the scene.
*/

'use strict';

const mat4 = glMatrix.mat4;
const vec3 = glMatrix.vec3;

// WebGL + program
let gl;
let phongProgram;

// Shapes and VAOs
let sphereShape, cubeShape, floorShape;
let sphereVAO, cubeVAO, floorVAO;

// Texture (wood floor)
let woodTexture = null;

// Camera & matrices
let viewMatrix = mat4.create();
let projMatrix = mat4.create();
// Slightly lower and closer camera for a nicer composition
let cameraPosition = vec3.fromValues(0.0, 1.6, 4.0);

// Rotation around Y for the whole stack
let rotationY = 0.0;

// Light properties (single point light, softened)
const lightPosition = vec3.fromValues(1.8, 2.5, 2.0);
const lightAmbient  = vec3.fromValues(0.20, 0.20, 0.20);
const lightDiffuse  = vec3.fromValues(1.0, 1.0, 1.0);
const lightSpecular = vec3.fromValues(0.9, 0.9, 0.9);

// Material: gold sphere (slightly softer highlight)
const goldAmbient   = [0.25, 0.20, 0.07];
const goldDiffuse   = [1.0, 0.72, 0.22];
const goldSpecular  = [0.9, 0.9, 0.9];
const goldShininess = 32.0;

// Material: grey cube (more matte, a bit lighter)
const greyAmbient   = [0.2, 0.2, 0.2];
const greyDiffuse   = [0.7, 0.7, 0.7];
const greySpecular  = [0.15, 0.15, 0.15];
const greyShininess = 8.0;

// Material: wooden floor color comes mostly from texture
const floorAmbient   = [0.25, 0.20, 0.15];
const floorDiffuse   = [1.0, 1.0, 1.0];
const floorSpecular  = [0.1, 0.1, 0.1];
const floorShininess = 8.0;

//
// Entry point
//
function init() {
    const canvas = document.getElementById('webgl-canvas');

    gl = canvas.getContext('webgl2');
    if (!gl) {
        alert('WebGL 2 is not available in this browser.');
        return;
    }

    // Basic GL state
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.frontFace(gl.CCW);
    // Very dark grey background instead of pure black
    gl.clearColor(0.03, 0.03, 0.03, 1.0);
    gl.clearDepth(1.0);
    gl.depthFunc(gl.LEQUAL);

    // Compile/link shaders & set up program
    initPrograms();

    // Load textures
    setUpTextures();

    // Create geometry and VAOs
    createShapes();

    // Keyboard controls
    window.addEventListener('keydown', handleKey);

    // First draw
    draw();
}

//
// Create shapes and VAOs
//
function createShapes() {
    // Tessellation levels
    sphereShape = new Sphere(40, 40);
    cubeShape   = new Cube(20);
    floorShape  = new Cube(2);   // will be scaled flat & wide

    sphereVAO = bindVAO(sphereShape, phongProgram);
    cubeVAO   = bindVAO(cubeShape,   phongProgram);
    floorVAO  = bindVAO(floorShape,  phongProgram);
}

//
// Camera setup
//
function setUpCamera(program) {
    gl.useProgram(program);

    const canvas = gl.canvas;
    const aspect = canvas.width / canvas.height;

    mat4.perspective(
        projMatrix,
        glMatrix.glMatrix.toRadian(45),
        aspect,
        0.1,
        100.0
    );

    const eye    = cameraPosition;
    const center = vec3.fromValues(0.0, 0.8, 0.0); // look slightly above cube center
    const up     = vec3.fromValues(0.0, 1.0, 0.0);

    mat4.lookAt(viewMatrix, eye, center, up);

    gl.uniformMatrix4fv(program.uProjectionMatrix, false, projMatrix);
    gl.uniformMatrix4fv(program.uViewMatrix,       false, viewMatrix);
    gl.uniform3fv     (program.uViewPosition,      eye);
}

//
// Texture setup (wood floor)
//
function setUpTextures() {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    woodTexture = gl.createTexture();
    const woodImage = document.getElementById('wood-texture');

    gl.bindTexture(gl.TEXTURE_2D, woodTexture);
    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        woodImage
    );

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.bindTexture(gl.TEXTURE_2D, null);
}

//
// Draw the entire scene (sphere, cube, floor)
//
function drawShapes() {
    gl.useProgram(phongProgram);

    // Camera + light
    setUpCamera(phongProgram);
    gl.uniform3fv(phongProgram.uLightPosition, lightPosition);
    gl.uniform3fv(phongProgram.uLightAmbient,  lightAmbient);
    gl.uniform3fv(phongProgram.uLightDiffuse,  lightDiffuse);
    gl.uniform3fv(phongProgram.uLightSpecular, lightSpecular);

    let model;

    // ===== Gold sphere =====
    model = mat4.create();
    mat4.rotateY(model, model, rotationY);
    mat4.translate(model, model, [0.0, 0.75, 0.0]);  
    gl.uniformMatrix4fv(phongProgram.uModelMatrix, false, model);

    gl.uniform3fv(phongProgram.uMaterialAmbient,  goldAmbient);
    gl.uniform3fv(phongProgram.uMaterialDiffuse,  goldDiffuse);
    gl.uniform3fv(phongProgram.uMaterialSpecular, goldSpecular);
    gl.uniform1f (phongProgram.uShininess,        goldShininess);
    gl.uniform1i (phongProgram.uUseTexture,       0);

    gl.bindVertexArray(sphereVAO);
    gl.drawElements(gl.TRIANGLES, sphereShape.indices.length, gl.UNSIGNED_SHORT, 0);

    //  Grey cube pedestal 
    model = mat4.create();
    mat4.rotateY(model, model, rotationY);
    mat4.translate(model, model, [0.0, -0.25, 0.0]);
    mat4.scale(model, model, [1.4, 0.75, 1.4]);
    gl.uniformMatrix4fv(phongProgram.uModelMatrix, false, model);

    gl.uniform3fv(phongProgram.uMaterialAmbient,  greyAmbient);
    gl.uniform3fv(phongProgram.uMaterialDiffuse,  greyDiffuse);
    gl.uniform3fv(phongProgram.uMaterialSpecular, greySpecular);
    gl.uniform1f (phongProgram.uShininess,        greyShininess);
    gl.uniform1i (phongProgram.uUseTexture,       0);

    gl.bindVertexArray(cubeVAO);
    gl.drawElements(gl.TRIANGLES, cubeShape.indices.length, gl.UNSIGNED_SHORT, 0);

    //  Wooden floor 
    model = mat4.create();
    // Raises the floor slightly so more wood is visible
    mat4.translate(model, model, [0.0, -1.1, 0.0]);
    mat4.scale(model, model, [8.0, 0.1, 6.0]);   // big flat slab
    gl.uniformMatrix4fv(phongProgram.uModelMatrix, false, model);

    gl.uniform3fv(phongProgram.uMaterialAmbient,  floorAmbient);
    gl.uniform3fv(phongProgram.uMaterialDiffuse,  floorDiffuse);
    gl.uniform3fv(phongProgram.uMaterialSpecular, floorSpecular);
    gl.uniform1f (phongProgram.uShininess,        floorShininess);
    gl.uniform1i (phongProgram.uUseTexture,       1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, woodTexture);
    gl.uniform1i(phongProgram.uSampler, 0);

    gl.bindVertexArray(floorVAO);
    gl.drawElements(gl.TRIANGLES, floorShape.indices.length, gl.UNSIGNED_SHORT, 0);

    
    gl.bindVertexArray(null);
}

//
// High-level draw
//
function draw() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    drawShapes();
}

//
// Compile/link program and get attribute/uniform locations
//
function initPrograms() {
    const vs = getShader('phong-V');
    const fs = getShader('phong-F');

    phongProgram = gl.createProgram();
    gl.attachShader(phongProgram, vs);
    gl.attachShader(phongProgram, fs);
    gl.linkProgram(phongProgram);

    if (!gl.getProgramParameter(phongProgram, gl.LINK_STATUS)) {
        console.error('Could not link shaders:', gl.getProgramInfoLog(phongProgram));
        return;
    }

    gl.useProgram(phongProgram);

    // Attributes
    phongProgram.aVertexPosition = gl.getAttribLocation(phongProgram, 'aVertexPosition');
    phongProgram.aVertexNormal   = gl.getAttribLocation(phongProgram, 'aVertexNormal');
    phongProgram.aTexCoord       = gl.getAttribLocation(phongProgram, 'aTexCoord');

    // Uniforms
    phongProgram.uModelMatrix      = gl.getUniformLocation(phongProgram, 'uModelMatrix');
    phongProgram.uViewMatrix       = gl.getUniformLocation(phongProgram, 'uViewMatrix');
    phongProgram.uProjectionMatrix = gl.getUniformLocation(phongProgram, 'uProjectionMatrix');
    phongProgram.uViewPosition     = gl.getUniformLocation(phongProgram, 'uViewPosition');

    phongProgram.uLightPosition = gl.getUniformLocation(phongProgram, 'uLightPosition');
    phongProgram.uLightAmbient  = gl.getUniformLocation(phongProgram, 'uLightAmbient');
    phongProgram.uLightDiffuse  = gl.getUniformLocation(phongProgram, 'uLightDiffuse');
    phongProgram.uLightSpecular = gl.getUniformLocation(phongProgram, 'uLightSpecular');

    phongProgram.uMaterialAmbient  = gl.getUniformLocation(phongProgram, 'uMaterialAmbient');
    phongProgram.uMaterialDiffuse  = gl.getUniformLocation(phongProgram, 'uMaterialDiffuse');
    phongProgram.uMaterialSpecular = gl.getUniformLocation(phongProgram, 'uMaterialSpecular');
    phongProgram.uShininess        = gl.getUniformLocation(phongProgram, 'uShininess');

    phongProgram.uUseTexture = gl.getUniformLocation(phongProgram, 'uUseTexture');
    phongProgram.uSampler    = gl.getUniformLocation(phongProgram, 'uSampler');
}

//
// Builds a VAO from a cgIShape object
//
function bindVAO(shape, program) {
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    // Positions
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shape.points), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(program.aVertexPosition);
    gl.vertexAttribPointer(program.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

    // Normals
    if (program.aVertexNormal !== -1 && shape.normals.length > 0) {
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shape.normals), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(program.aVertexNormal);
        gl.vertexAttribPointer(program.aVertexNormal, 3, gl.FLOAT, false, 0, 0);
    }

    // Texture coordinates
    if (program.aTexCoord !== -1 && shape.uv.length > 0) {
        const texBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(shape.uv), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(program.aTexCoord);
        gl.vertexAttribPointer(program.aTexCoord, 2, gl.FLOAT, false, 0, 0);
    }

    // Indices
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(shape.indices), gl.STATIC_DRAW);

    // Clean up state
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);

    return vao;
}

//
// Utility to compile a shader from a <script> tag
//
function getShader(id) {
    const script = document.getElementById(id);
    if (!script) {
        console.error('Unknown script id', id);
        return null;
    }

    const source = script.text.trim();
    let shader;

    if (script.type === 'x-shader/x-vertex') {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else if (script.type === 'x-shader/x-fragment') {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Error compiling shader', id, gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

//
// Keyboard controls: rotate + zoom + reset
//
function handleKey(event) {
    const key = event.key;
    const step = glMatrix.glMatrix.toRadian(5);

    if (key === 'a' || key === 'A' || key === 'ArrowLeft') {
        rotationY -= step;
    } else if (key === 'd' || key === 'D' || key === 'ArrowRight') {
        rotationY += step;
    } else if (key === 'w' || key === 'W' || key === 'ArrowUp') {
        cameraPosition[2] -= 0.2;
    } else if (key === 's' || key === 'S' || key === 'ArrowDown') {
        cameraPosition[2] += 0.2;
    } else if (key === 'r' || key === 'R') {
        cameraPosition[0] = 0.0;
        cameraPosition[1] = 1.6;
        cameraPosition[2] = 4.0;
        rotationY = 0.0;
    }

    draw();
}

// 
window.addEventListener('load', init);

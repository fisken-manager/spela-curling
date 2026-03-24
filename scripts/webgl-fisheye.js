const VERTEX_SHADER = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
varying vec2 v_texCoord;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
}
`;

const BARREL_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_strength;

void main() {
    vec2 center = vec2(0.5, 0.5);
    vec2 uv = v_texCoord - center;
    
    float dist = length(uv);
    float k = u_strength /800.0;
    
    float factor = max(0.1, 1.0 - k * dist * dist);
    vec2 distortedUV = center + uv / factor;
    
    if (distortedUV.x < 0.0 || distortedUV.x > 1.0 || 
        distortedUV.y < 0.0 || distortedUV.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    } else {
        gl_FragColor = texture2D(u_texture, distortedUV);
    }
}
`;

const PERSPECTIVE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_strength;

void main() {
    vec2 center = vec2(0.5, 0.5);
    vec2 uv = v_texCoord;
    
    float s = u_strength / 100.0;
    vec2 offset = uv - center;
    float normalizedX = offset.x / 0.5;
    
    float curveFactor = 1.0 - s * normalizedX * normalizedX * 0.5;
    curveFactor = max(0.1, curveFactor);
    
    uv.y = center.y + offset.y / curveFactor;
    
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    } else {
        gl_FragColor = texture2D(u_texture, uv);
    }
}
`;

const STRONG_FISHEYE_FRAGMENT_SHADER = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
uniform float u_strength;

void main() {
    vec2 center = vec2(0.5, 0.5);
    vec2 uv = v_texCoord - center;
    
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    float k = u_strength / 400.0;
    
    float radialDistort = 1.0 + k * dist * dist * (1.0 + k * dist * dist * 0.5);
    float newDist = dist / radialDistort;
    
    vec2 distortedUV = center + vec2(cos(angle), sin(angle)) * newDist;
    
    if (distortedUV.x < 0.0 || distortedUV.x > 1.0 || 
        distortedUV.y < 0.0 || distortedUV.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    } else {
        gl_FragColor = texture2D(u_texture, distortedUV);
    }
}
`;

export class WebGLFisheye {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl', {
            alpha: true,
            premultipliedAlpha: false,
            antialias: false,
            preserveDrawingBuffer: true
        });
        
        if (!this.gl) {
            console.warn('WebGL not supported, fisheye effects disabled');
            this.enabled = false;
            return;
        }
        
        this.enabled = true;
        this.gl = this.gl;
        this.programs = {};
        this.currentEffect = 'barrel';
        this.strength = 40;
        this.texture = null;
        this.positionBuffer = null;
        this.texCoordBuffer = null;
        this.initialized = false;
        
        this.init();
    }
    
    init() {
        try {
            const gl = this.gl;
            
            // Flip Y in texture coordinates to match Canvas 2D orientation
        // Canvas Y=0 is top, WebGL Y=0 is bottom
        const quadVertices = new Float32Array([
            -1, -1,  0, 1,  // bottom-left -> tex top-left
             1, -1,  1, 1,  // bottom-right -> tex top-right
            -1,  1,  0, 0,  // top-left -> tex bottom-left
             1,  1,  1, 0   // top-right -> tex bottom-right
        ]);
            
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);
            
            this.positionBuffer = buffer;
            
            this.programs.barrel = this.createProgram(VERTEX_SHADER, BARREL_FRAGMENT_SHADER);
            this.programs.perspective = this.createProgram(VERTEX_SHADER, PERSPECTIVE_FRAGMENT_SHADER);
            this.programs.strong = this.createProgram(VERTEX_SHADER, STRONG_FISHEYE_FRAGMENT_SHADER);
            
            if (!this.programs.barrel || !this.programs.perspective || !this.programs.strong) {
                console.warn('WebGL fisheye: Failed to compile shaders');
                this.enabled = false;
                return;
            }
            
            this.texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            
            this.initialized = true;
        } catch (e) {
            console.warn('WebGL fisheye: Initialization error', e);
            this.enabled = false;
        }
    }
    
    createShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
    
    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        const vertexShader = this.createShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        if (!vertexShader || !fragmentShader) return null;
        
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(program));
            return null;
        }
        
        return {
            program,
            positionLocation: gl.getAttribLocation(program, 'a_position'),
            texCoordLocation: gl.getAttribLocation(program, 'a_texCoord'),
            textureLocation: gl.getUniformLocation(program, 'u_texture'),
            strengthLocation: gl.getUniformLocation(program, 'u_strength')
        };
    }
    
    setEffect(type, strength) {
        this.currentEffect = type === 'fisheye' ? 'strong' : type;
        this.strength = strength;
    }
    
    render(sourceCanvas) {
        if (!this.enabled || !this.initialized || this.currentEffect === 'none') {
            return false;
        }
        
        const gl = this.gl;
        const program = this.programs[this.currentEffect];
        
        if (!program) return false;
        
        if (this.canvas.width !== sourceCanvas.width || 
            this.canvas.height !== sourceCanvas.height) {
            this.canvas.width = sourceCanvas.width;
            this.canvas.height = sourceCanvas.height;
            gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
        
        // Clear to transparent
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
        
        gl.useProgram(program.program);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        
        gl.enableVertexAttribArray(program.positionLocation);
        gl.vertexAttribPointer(program.positionLocation, 2, gl.FLOAT, false, 16, 0);
        
        gl.enableVertexAttribArray(program.texCoordLocation);
        gl.vertexAttribPointer(program.texCoordLocation, 2, gl.FLOAT, false, 16, 8);
        
        gl.uniform1i(program.textureLocation, 0);
        gl.uniform1f(program.strengthLocation, this.strength);
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        return true;
    }
}
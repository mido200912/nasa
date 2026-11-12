// Object-space 3D gradient Perlin noise: no texture requests, seams, or UV poles.
export const planetVertexShader = /* glsl */ `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vPosition = position;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const planetFragmentShader = /* glsl */ `
  precision highp float;
  uniform float uKind;
  uniform float uBrightness;
  uniform vec3 uRim;
  uniform float uSolarLighting;
  uniform vec3 uSunPosition;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec3 vWorld;

  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1,311.7,74.7)), dot(p,vec3(269.5,183.3,246.1)), dot(p,vec3(113.5,271.9,124.6)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f*f*f*(f*(f*6.0-15.0)+10.0);
    return mix(mix(mix(dot(hash3(i),f),dot(hash3(i+vec3(1,0,0)),f-vec3(1,0,0)),u.x),
      mix(dot(hash3(i+vec3(0,1,0)),f-vec3(0,1,0)),dot(hash3(i+vec3(1,1,0)),f-vec3(1,1,0)),u.x),u.y),
      mix(mix(dot(hash3(i+vec3(0,0,1)),f-vec3(0,0,1)),dot(hash3(i+vec3(1,0,1)),f-vec3(1,0,1)),u.x),
      mix(dot(hash3(i+vec3(0,1,1)),f-vec3(0,1,1)),dot(hash3(i+vec3(1,1,1)),f-vec3(1,1,1)),u.x),u.y),u.z);
  }
  float fbm(vec3 p) {
    float value = 0.0, amplitude = 0.5;
    for (int i=0; i<5; i++) { value += amplitude * noise(p); p = p*2.06+vec3(7.1); amplitude *= 0.49; }
    return value;
  }
  float craters(vec3 p) {
    vec3 cell = floor(p), f = fract(p);
    float result = 0.0;
    for (int x=-1; x<=1; x++) {
      for (int y=-1; y<=1; y++) {
        for (int z=-1; z<=1; z++) {
          vec3 offset = vec3(float(x),float(y),float(z));
          vec3 random = hash3(cell+offset)*0.5+0.5;
          float d = length(offset + 0.18 + random*0.64 - f);
          float radius = 0.12 + random.x*0.21;
          float bowl = -(1.0-smoothstep(radius*0.25, radius, d))*0.45;
          float rim = exp(-pow((d-radius)*28.0, 2.0))*0.24;
          result += bowl + rim;
        }
      }
    }
    return result;
  }
  void main() {
    vec3 p = normalize(vPosition);
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(cameraPosition-vWorld);
    vec3 sun = uSolarLighting > 0.5 ? normalize(uSunPosition-vWorld) : normalize(vec3(-5.0, 3.0, 3.0));
    float terrain = fbm(p*5.0);
    float detail = fbm(p*65.0);
    vec3 surface;
    float crater = 0.0;
    if (uKind < 0.5) {
      crater = craters(p*11.0);
      float maria = smoothstep(-0.15,0.16,fbm(p*3.0));
      surface = mix(vec3(0.22,0.24,0.27),vec3(0.69,0.69,0.65),maria);
      surface += terrain*0.30 + detail*0.10 + crater*0.55;
    } else if (uKind < 1.5) {
      float canyon = pow(1.0-abs(noise(p*8.0+terrain*2.5)),12.0);
      surface = mix(vec3(0.25,0.075,0.035),vec3(0.83,0.38,0.16),terrain+0.55);
      surface -= canyon*0.1;
      surface += detail*0.16;
      float ice = smoothstep(0.91,0.99,abs(p.y)+terrain*0.08);
      surface = mix(surface,vec3(0.75,0.7,0.61),ice);
    } else if (uKind < 3.5) {
      float continents = fbm(p*3.2+vec3(1.7,0.0,2.1));
      float land = smoothstep(0.01,0.055,continents);
      surface = mix(vec3(0.015,0.095,0.23),vec3(0.15,0.27,0.15)+terrain*0.2,land);
      float clouds = smoothstep(0.13,0.31,fbm(p*8.0+vec3(12.0)));
      surface = mix(surface,vec3(0.83,0.88,0.9),clouds*0.85);
      float ice = smoothstep(0.88,0.99,abs(p.y)+terrain*0.14);
      surface = mix(surface,vec3(0.82,0.87,0.87),ice);
      if (uKind < 2.5) surface = mix(surface,vec3(0.02,0.23,0.34)+terrain*0.18,0.45);
    } else if (uKind < 4.5) {
      crater = craters(p*9.0);
      surface = mix(vec3(0.19,0.16,0.13),vec3(0.51,0.47,0.40),terrain+0.6);
      surface += detail*0.1+crater*0.35;
    } else if (uKind < 5.5) {
      float clouds = fbm(p*6.0+vec3(terrain*2.0));
      surface = mix(vec3(0.49,0.25,0.07),vec3(0.94,0.79,0.48),clouds+0.6);
      surface += sin(p.y*28.0+terrain*12.0)*0.035;
    } else if (uKind < 7.5) {
      float bands = sin(p.y*42.0+fbm(p*9.0)*8.0)*0.5+0.5;
      if (uKind < 6.5) {
        surface = mix(vec3(0.37,0.20,0.11),vec3(0.86,0.76,0.59),bands);
        float storm = exp(-pow((p.y+0.2)*13.0,2.0)-pow((p.x-0.45)*7.0,2.0));
        surface = mix(surface,vec3(0.65,0.25,0.12),storm*0.75);
      } else {
        surface = mix(vec3(0.50,0.41,0.25),vec3(0.88,0.80,0.59),bands*0.45+0.3);
      }
      surface += terrain*0.12;
    } else if (uKind < 8.5) {
      surface = vec3(0.37,0.74,0.77)+terrain*0.08+sin(p.x*28.0)*0.008;
    } else {
      float bands = sin(p.y*26.0+terrain*5.0);
      surface = vec3(0.045,0.19,0.65)+terrain*0.18+bands*0.025;
    }
    // Derivative-based terrain normal gives noise and craters real directional relief.
    float height = terrain*0.2 + detail*0.04;
    if (uKind < 0.5 || (uKind > 3.5 && uKind < 4.5)) height += crater*0.14;
    if (uKind > 4.5) height *= 0.12;
    vec3 dpdx = dFdx(vWorld), dpdy = dFdy(vWorld);
    vec3 r1 = cross(dpdy,normal), r2 = cross(normal,dpdx);
    float determinant = dot(dpdx,r1);
    vec3 gradient = sign(determinant)*(dFdx(height)*r1+dFdy(height)*r2);
    vec3 bumped = normalize(abs(determinant)*normal-gradient*0.12);
    float diffuse = max(dot(bumped,sun),0.0);
    float fresnel = pow(1.0-max(dot(normal,view),0.0),3.5);
    vec3 color = surface*(0.065+diffuse*1.3);
    color += uRim*fresnel*0.4;
    gl_FragColor = vec4(color*uBrightness,1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const saturnRingVertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }
`;

export const saturnRingFragmentShader = /* glsl */ `
  uniform float uBrightness;
  varying vec2 vUv;
  void main() {
    float radius=length((vUv-0.5)*2.0);
    float bands=sin(radius*220.0)*0.18+sin(radius*91.0)*0.12;
    float gap=1.0-smoothstep(0.0,0.013,abs(radius-0.81));
    vec3 color=mix(vec3(0.39,0.31,0.20),vec3(0.82,0.73,0.53),radius+bands);
    gl_FragColor=vec4(color*uBrightness,(0.55+bands)*(1.0-gap));
    #include <colorspace_fragment>
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uRim;
  uniform float uBrightness;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vec3 view = normalize(cameraPosition-vWorld);
    float rim = pow(1.0-abs(dot(normalize(vNormal),view)),4.5);
    gl_FragColor = vec4(uRim, rim*0.24*uBrightness);
    #include <colorspace_fragment>
  }
`;

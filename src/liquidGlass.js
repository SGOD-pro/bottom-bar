// Adapted from clone_repo/index.html (Liquid Glass, Copyright (c) 2026 Archis Vaze).
// The source project is MIT-licensed; see clone_repo/LICENSE.
import { liquidGlassSettings } from './liquidGlassSettings';

const surfaceHeight = (x) => Math.pow(1 - Math.pow(1 - x, 4), 0.25);

const makeRefractionProfile = (thickness, bezel, samples) => {
  const profile = new Float64Array(samples);
  const eta = 1 / 1.5;

  for (let i = 0; i < samples; i += 1) {
    const x = i / samples;
    const y = surfaceHeight(x);
    const derivative = (surfaceHeight(x + 0.0001) - y) / 0.0001;
    const magnitude = Math.hypot(derivative, 1);
    const normalX = -derivative / magnitude;
    const normalY = -1 / magnitude;
    const dot = normalY;
    const discriminant = 1 - eta * eta * (1 - dot * dot);

    if (discriminant < 0) continue;

    const factor = eta * dot + Math.sqrt(discriminant);
    const refractedX = -(factor * normalX);
    const refractedY = eta - factor * normalY;
    profile[i] = refractedX * ((y * bezel + thickness) / refractedY);
  }

  return profile;
};

const makeCanvasMap = (width, height, draw) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) throw new Error('Unable to create Liquid Glass canvas maps.');

  const image = context.createImageData(width, height);
  draw(image.data, width, height);
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
};

const makeDisplacementMap = (width, height, radius, bezel, profile, maxDisplacement) =>
  makeCanvasMap(width, height, (data) => {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128;
      data[i + 1] = 128;
      data[i + 3] = 255;
    }

    const innerRadiusSquared = Math.max(radius - bezel, 0) ** 2;
    const straightWidth = width - radius * 2;
    const straightHeight = height - radius * 2;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const cornerX = x < radius ? x - radius : x >= width - radius ? x - radius - straightWidth : 0;
        const cornerY = y < radius ? y - radius : y >= height - radius ? y - radius - straightHeight : 0;
        const distanceSquared = cornerX * cornerX + cornerY * cornerY;
        if (distanceSquared < innerRadiusSquared) continue;

        const distance = Math.sqrt(distanceSquared);
        const fromEdge = radius - distance;
        const opacity = distanceSquared < radius * radius
          ? 1
          : 1 - (distance - radius) / (Math.sqrt((radius + 1) ** 2) - radius);
        if (opacity <= 0 || distance === 0) continue;

        const profileIndex = Math.min(((fromEdge / bezel) * profile.length) | 0, profile.length - 1);
        const displacement = profile[profileIndex] || 0;
        const index = (y * width + x) * 4;
        data[index] = (128 - (cornerX / distance) * displacement / maxDisplacement * 127 * opacity + 0.5) | 0;
        data[index + 1] = (128 - (cornerY / distance) * displacement / maxDisplacement * 127 * opacity + 0.5) | 0;
      }
    }
  });

const makeSpecularMap = (width, height, radius, bezel, angle, fresnel) =>
  makeCanvasMap(width, height, (data) => {
    const innerRadiusSquared = Math.max(radius - bezel, 0) ** 2;
    const straightWidth = width - radius * 2;
    const straightHeight = height - radius * 2;
    const lightX = Math.cos((angle * Math.PI) / 180);
    const lightY = Math.sin((angle * Math.PI) / 180);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const cornerX = x < radius ? x - radius : x >= width - radius ? x - radius - straightWidth : 0;
        const cornerY = y < radius ? y - radius : y >= height - radius ? y - radius - straightHeight : 0;
        const distanceSquared = cornerX * cornerX + cornerY * cornerY;
        if (distanceSquared < innerRadiusSquared) continue;

        const distance = Math.sqrt(distanceSquared);
        if (distance === 0) continue;
        const fromEdge = radius - distance;
        const opacity = distanceSquared < radius * radius
          ? 1
          : 1 - (distance - radius) / (Math.sqrt((radius + 1) ** 2) - radius);
        if (opacity <= 0) continue;

        const dot = Math.abs((cornerX / distance) * lightX - (cornerY / distance) * lightY);
        const edge = Math.sqrt(Math.max(0, 1 - (1 - fromEdge) ** 2));
        const glare = dot * edge;
        const fresnelEdge = Math.max(0, Math.min(1, 1 - fromEdge / fresnel.range));
        const fresnelHighlight = Math.pow(fresnelEdge, fresnel.hardness) * fresnel.factor;
        const highlight = Math.min(1, glare + fresnelHighlight);
        const color = (255 * highlight) | 0;
        const index = (y * width + x) * 4;
        data[index] = color;
        data[index + 1] = color;
        data[index + 2] = color;
        data[index + 3] = (color * opacity) | 0;
      }
    }
  });

export const buildLiquidGlassFilter = (element) => {
  const bounds = element.getBoundingClientRect();
  const width = Math.max(2, Math.round(bounds.width));
  const height = Math.max(2, Math.round(bounds.height));
  const { controls } = liquidGlassSettings;
  const radius = Math.floor(Math.min(controls.shapeRadius, width / 2, height / 2));
  const bezel = Math.max(1, Math.min(radius - 1, controls.refFresnelRange));
  const fresnel = {
    range: Math.max(1, Math.min(radius, controls.refFresnelRange)),
    hardness: Math.max(0.1, controls.refFresnelHardness / 10),
    factor: controls.refFresnelFactor / 100,
  };
  const profile = makeRefractionProfile(controls.refThickness, bezel, 128);
  const maxDisplacement = Math.max(...Array.from(profile, Math.abs)) || 1;
  const displacementMap = makeDisplacementMap(width, height, radius, bezel, profile, maxDisplacement);
  const specularMap = makeSpecularMap(
    width,
    height,
    radius,
    Math.min(radius, controls.glareRange),
    controls.glareAngle,
    fresnel,
  );

  return `<filter id="liquid-glass-filter" x="0%" y="0%" width="100%" height="100%">
    <feImage href="${displacementMap}" x="0" y="0" width="${width}" height="${height}" result="displacement" />
    <feDisplacementMap in="SourceGraphic" in2="displacement" scale="${maxDisplacement * controls.refFactor + width * controls.refDistance}" xChannelSelector="R" yChannelSelector="G" result="refracted" />
    <feColorMatrix in="refracted" type="saturate" values="1.2" result="saturated" />
    <feImage href="${specularMap}" x="0" y="0" width="${width}" height="${height}" result="specular" />
    <feComposite in="saturated" in2="specular" operator="in" result="masked" />
    <feComponentTransfer in="specular" result="highlight">
      <feFuncA type="linear" slope="${controls.glareFactor / 100}" />
    </feComponentTransfer>
    <feBlend in="masked" in2="refracted" mode="normal" result="glass" />
    <feBlend in="highlight" in2="glass" mode="normal" />
  </filter>`;
};

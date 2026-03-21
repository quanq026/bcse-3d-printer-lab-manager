import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import JSZip from 'jszip';
import { Box } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';
import { getUiText } from '../lib/uiText';

interface FilePreviewProps {
  file: File;
  className?: string;
}

// Minimal STL parser (binary + ASCII) → THREE.BufferGeometry
function parseSTL(buffer: ArrayBuffer): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  // Try binary STL first (starts after 80-byte header + 4-byte triangle count)
  const view = new DataView(buffer);
  const triangleCount = view.getUint32(80, true);
  const expectedSize = 80 + 4 + triangleCount * 50;

  if (buffer.byteLength === expectedSize && triangleCount > 0) {
    const positions: number[] = [];
    const normals: number[] = [];
    let offset = 84;
    for (let i = 0; i < triangleCount; i++) {
      const nx = view.getFloat32(offset, true);
      const ny = view.getFloat32(offset + 4, true);
      const nz = view.getFloat32(offset + 8, true);
      offset += 12;
      for (let v = 0; v < 3; v++) {
        positions.push(
          view.getFloat32(offset, true),
          view.getFloat32(offset + 4, true),
          view.getFloat32(offset + 8, true),
        );
        normals.push(nx, ny, nz);
        offset += 12;
      }
      offset += 2; // attribute byte count
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return geometry;
  }

  // ASCII STL fallback
  const text = new TextDecoder().decode(buffer);
  const positions: number[] = [];
  const vertexRe = /vertex\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = vertexRe.exec(text)) !== null) {
    positions.push(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function STLViewer({ buffer }: { buffer: ArrayBuffer }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const w = el.clientWidth || 300;
    const h = el.clientHeight || 220;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 10000);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(1, 2, 3);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0x8ecae6, 0.4);
    dir2.position.set(-2, -1, -1);
    scene.add(dir2);

    // Geometry
    const geometry = parseSTL(buffer);
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);

    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);

    const material = new THREE.MeshPhongMaterial({
      color: 0x4f90d9,
      specular: 0x888888,
      shininess: 40,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    camera.position.set(0, 0, maxDim * 2);
    camera.lookAt(0, 0, 0);

    // Simple auto-rotate
    let angle = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      angle += 0.008;
      mesh.rotation.y = angle;
      mesh.rotation.x = 0.25;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [buffer]);

  return <div ref={mountRef} className="w-full h-full" />;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ file, className = '' }) => {
  const { lang } = useLang();
  const copy = getUiText(lang);
  const unavailableMessage = copy.filePreview.unavailable;
  const [state, setState] = useState<'loading' | 'stl' | 'img' | 'error'>('loading');
  const [stlBuffer, setStlBuffer] = useState<ArrayBuffer | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setState('loading');
      setStlBuffer(null);
      setImgSrc(null);

      try {
        const name = file.name.toLowerCase();
        const is3mf = name.endsWith('.3mf');
        const ext = name.split('.').pop();

        if (ext === 'stl') {
          const buf = await file.arrayBuffer();
          if (!cancelled) { setStlBuffer(buf); setState('stl'); }

        } else if (is3mf) {
          const buf = await file.arrayBuffer();
          const zip = await JSZip.loadAsync(buf);

          // Find any thumbnail png or jpg
          const thumbFile = Object.keys(zip.files).find(n =>
            /\.(png|jpg|jpeg)$/i.test(n) && !n.includes('__MACOSX')
          );

          if (thumbFile) {
            const thumbBlob = await zip.files[thumbFile].async('blob');
            const url = URL.createObjectURL(thumbBlob);
            if (!cancelled) { setImgSrc(url); setState('img'); }
          } else {
            // No thumbnail — try to find embedded STL/geometry inside the 3mf
            const stlEntry = Object.keys(zip.files).find(name => /\.stl$/i.test(name));
            if (stlEntry) {
              const stlBuf = await zip.files[stlEntry].async('arraybuffer');
              if (!cancelled) { setStlBuffer(stlBuf); setState('stl'); }
            } else {
              // Fallback: read the main model file (3dmodel.model is XML) - just show icon
              if (!cancelled) setState('error');
            }
          }
        } else {
          if (!cancelled) setState('error');
        }
      } catch (e: unknown) {
        if (!cancelled) { setErrorMsg(e instanceof Error ? e.message : unavailableMessage); setState('error'); }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [file, unavailableMessage]);

  // Cleanup object URL
  useEffect(() => {
    return () => { if (imgSrc) URL.revokeObjectURL(imgSrc); };
  }, [imgSrc]);

  const containerClass = `relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${className}`;

  if (state === 'loading') {
    return (
      <div className={containerClass}>
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">{copy.filePreview.loading}</span>
        </div>
      </div>
    );
  }

  if (state === 'stl' && stlBuffer) {
    return (
      <div className={containerClass}>
        <STLViewer buffer={stlBuffer} />
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 text-white text-[10px] font-bold px-2 py-1 rounded-full">
          <Box size={10} />
          {copy.filePreview.threeDPreview}
        </div>
      </div>
    );
  }

  if (state === 'img' && imgSrc) {
    return (
      <div className={containerClass}>
        <img src={imgSrc} alt={copy.filePreview.threeMfThumbnail} className="w-full h-full object-contain p-2" />
        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 text-white text-[10px] font-bold px-2 py-1 rounded-full">
          <Box size={10} />
          {copy.filePreview.threeMfThumbnail}
        </div>
      </div>
    );
  }

  // error / fallback
  return (
    <div className={containerClass}>
      <div className="flex flex-col items-center gap-2 text-slate-400">
        <Box size={32} strokeWidth={1} />
        <span className="text-xs text-center px-2">{errorMsg || unavailableMessage}</span>
      </div>
    </div>
  );
};

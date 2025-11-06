// 顯示設定:讓 x>0 出現在畫面右側(右腦在右)
const X_RIGHT_ON_SCREEN_RIGHT = true;

import { API_BASE } from '../api'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as nifti from 'nifti-reader-js'

const MNI_BG_URL = 'static/mni_2mm.nii.gz'

function isStandardMNI2mm(dims, voxelMM) {
  const okDims = Array.isArray(dims) && dims[0]===91 && dims[1]===109 && dims[2]===91;
  const okSp   = voxelMM && Math.abs(voxelMM[0]-2)<1e-3 && Math.abs(voxelMM[1]-2)<1e-3 && Math.abs(voxelMM[2]-2)<1e-3;
  return okDims && okSp;
}
const MNI2MM = { x0: 90, y0: -126, z0: -72, vx: 2, vy: 2, vz: 2 };

export function NiiViewer({ query, selectedStudies = [] }) {
  const [loadingBG, setLoadingBG] = useState(false)
  const [loadingMap, setLoadingMap] = useState(false)
  const [errBG, setErrBG] = useState('')
  const [errMap, setErrMap] = useState('')

  const [voxel, setVoxel] = useState(2.0)
  const [fwhm, setFwhm] = useState(10.0)
  const [kernel, setKernel] = useState('gauss')
  const [r, setR] = useState(6.0)

  const [overlayAlpha, setOverlayAlpha] = useState(0.5)
  const [posOnly, setPosOnly] = useState(true)
  const [useAbs, setUseAbs] = useState(false)
  const [thrMode, setThrMode] = useState('pctl')
  const [pctl, setPctl] = useState(95)
  const [thrValue, setThrValue] = useState(0)

  const bgRef  = useRef(null)
  const mapRef = useRef(null)
  const getVoxelMM = () => {
    const vm = bgRef.current?.voxelMM ?? mapRef.current?.voxelMM ?? [1,1,1]
    return { x: vm[0], y: vm[1], z: vm[2] }
  }
  const [dims, setDims] = useState([0,0,0])

  const [ix, setIx] = useState(0)
  const [iy, setIy] = useState(0)
  const [iz, setIz] = useState(0)

  const [cx, setCx] = useState('0')
  const [cy, setCy] = useState('0')
  const [cz, setCz] = useState('0')

  const canvases = [useRef(null), useRef(null), useRef(null)]

  const effectiveQuery = useMemo(() => {
    if (selectedStudies.length > 0) {
      const ids = selectedStudies.map(s => s.study_id).filter(Boolean)
      return ids.length > 0 ? ids.join(' OR ') : query
    }
    return query
  }, [query, selectedStudies])

  const mapUrl = useMemo(() => {
    if (!effectiveQuery) return ''
    const u = new URL(`${API_BASE}/query/${encodeURIComponent(effectiveQuery)}/nii`)
    u.searchParams.set('voxel', String(voxel))
    u.searchParams.set('fwhm', String(fwhm))
    u.searchParams.set('kernel', String(kernel))
    u.searchParams.set('r', String(r))
    return u.toString()
  }, [effectiveQuery, voxel, fwhm, kernel, r])

  function asTypedArray (header, buffer) {
    switch (header.datatypeCode) {
      case nifti.NIFTI1.TYPE_INT8:    return new Int8Array(buffer)
      case nifti.NIFTI1.TYPE_UINT8:   return new Uint8Array(buffer)
      case nifti.NIFTI1.TYPE_INT16:   return new Int16Array(buffer)
      case nifti.NIFTI1.TYPE_UINT16:  return new Uint16Array(buffer)
      case nifti.NIFTI1.TYPE_INT32:   return new Int32Array(buffer)
      case nifti.NIFTI1.TYPE_UINT32:  return new Uint32Array(buffer)
      case nifti.NIFTI1.TYPE_FLOAT32: return new Float32Array(buffer)
      case nifti.NIFTI1.TYPE_FLOAT64: return new Float64Array(buffer)
      default: return new Float32Array(buffer)
    }
  }
  function minmax (arr) {
    let mn =  Infinity, mx = -Infinity
    for (let i = 0; i < arr.length; i++) {
      const v = arr[i]
      if (v < mn) mn = v
      if (v > mx) mx = v
    }
    return [mn, mx]
  }
  function percentile(arr, p, step=Math.ceil(arr.length/200000)) {
    if (!arr.length) return 0
    const samp = []
    for (let i=0; i<arr.length; i+=step) samp.push(arr[i])
    samp.sort((a,b)=>a-b)
    const k = Math.floor((p/100) * (samp.length - 1))
    return samp[Math.max(0, Math.min(samp.length-1, k))]
  }
  async function loadNifti(url) {
    const res = await fetch(url)
    if (!res.ok) {
      const t = await res.text().catch(()=> '')
      throw new Error(`GET ${url} → ${res.status} ${t}`)
    }
    let ab = await res.arrayBuffer()
    if (nifti.isCompressed(ab)) ab = nifti.decompress(ab)
    if (!nifti.isNIFTI(ab)) throw new Error('not a NIfTI file')
    const header = nifti.readHeader(ab)
    const image  = nifti.readImage(header, ab)
    const ta     = asTypedArray(header, image)
    let f32
    if (ta instanceof Float32Array) f32 = ta
    else if (ta instanceof Float64Array) f32 = Float32Array.from(ta)
    else {
      const [mn, mx] = minmax(ta)
      const range = (mx - mn) || 1
      f32 = new Float32Array(ta.length)
      for (let i=0;i<ta.length;i++) f32[i] = (ta[i] - mn) / range
    }
    const nx = header.dims[1] | 0
    const ny = header.dims[2] | 0
    const nz = header.dims[3] | 0
    if (!nx || !ny || !nz) throw new Error('invalid dims')
    const [mn, mx] = minmax(f32)
    const vx = Math.abs(header.pixDims?.[1] ?? 1)
    const vy = Math.abs(header.pixDims?.[2] ?? 1)
    const vz = Math.abs(header.pixDims?.[3] ?? 1)
    return { data: f32, dims:[nx,ny,nz], voxelMM:[vx,vy,vz], min: mn, max: mx }
  }

  const AXIS_SIGN = { x: -1, y: 1, z: 1 }
  const idx2coord = (i, n, axis) => {
    const [nx, ny, nz] = dims;
    const { x: vx, y: vy, z: vz } = getVoxelMM();
    const isStd = isStandardMNI2mm([nx, ny, nz], [vx, vy, vz]);
    if (isStd) {
      if (axis === 'x') return (-MNI2MM.vx * i + MNI2MM.x0);
      if (axis === 'y') return ( MNI2MM.vy * i + MNI2MM.y0);
      if (axis === 'z') return ( MNI2MM.vz * i + MNI2MM.z0);
    }
    const mmPerVoxel = axis === 'x' ? vx : axis === 'y' ? vy : vz;
    return AXIS_SIGN[axis] * (i - Math.floor(n/2)) * mmPerVoxel;
  }
  const coord2idx = (c_mm, n, axis) => {
    const [nx, ny, nz] = dims;
    const { x: vx, y: vy, z: vz } = getVoxelMM();
    const isStd = isStandardMNI2mm([nx, ny, nz], [vx, vy, vz]);
    if (isStd) {
      let v;
      if (axis === 'x') v = ( (MNI2MM.x0 - c_mm) / MNI2MM.vx );
      else if (axis === 'y') v = ( (c_mm - MNI2MM.y0) / MNI2MM.vy );
      else v = ( (c_mm - MNI2MM.z0) / MNI2MM.vz );
      const idx = Math.round(v);
      return Math.max(0, Math.min(n-1, idx));
    }
    const mmPerVoxel = axis === 'x' ? vx : axis === 'y' ? vy : vz;
    const sign = AXIS_SIGN[axis];
    const v = (sign * (c_mm / mmPerVoxel)) + Math.floor(n/2);
    const idx = Math.round(v);
    return Math.max(0, Math.min(n-1, idx));
  }

  useEffect(() => {
    let alive = true
    setLoadingBG(true); setErrBG('')
    ;(async () => {
      try {
        const bg = await loadNifti(MNI_BG_URL)
        if (!alive) return
        bgRef.current = bg
        setDims(bg.dims)
        const [nx,ny,nz] = bg.dims
        const mx = Math.floor(nx/2), my = Math.floor(ny/2), mz = Math.floor(nz/2)
        setIx(mx); setIy(my); setIz(mz)
        setCx('0'); setCy('0'); setCz('0')
      } catch (e) {
        if (!alive) return
        setErrBG(e?.message || String(e))
        bgRef.current = null
      } finally {
        if (!alive) return
        setLoadingBG(false)
      }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const mn = mapRef.current?.min ?? 0
    const mx = mapRef.current?.max ?? 1
    if (thrValue < mn || thrValue > mx) {
      setThrValue(Math.min(mx, Math.max(mn, thrValue)))
    }
  }, [mapRef.current, dims, thrValue])

  useEffect(() => {
    if (!mapUrl) { mapRef.current = null; return }
    let alive = true
    setLoadingMap(true); setErrMap('')
    ;(async () => {
      try {
        const mv = await loadNifti(mapUrl)
        if (!alive) return
        mapRef.current = mv
        if (!bgRef.current) {
          setDims(mv.dims)
          const [nx,ny,nz] = mv.dims
          const mx = Math.floor(nx/2), my = Math.floor(ny/2), mz = Math.floor(nz/2)
          setIx(mx); setIy(my); setIz(mz)
          setCx('0'); setCy('0'); setCz('0')
        }
      } catch (e) {
        if (!alive) return
        setErrMap(e?.message || String(e))
        mapRef.current = null
      } finally {
        if (!alive) return
        setLoadingMap(false)
      }
    })()
    return () => { alive = false }
  }, [mapUrl])

  const mapThreshold = useMemo(() => {
    const mv = mapRef.current
    if (!mv) return null
    if (thrMode === 'value') return Number(thrValue) || 0
    return percentile(mv.data, Math.max(0, Math.min(100, Number(pctl) || 95)))
  }, [thrMode, thrValue, pctl, mapRef.current])

  function drawSlice (canvas, axis, index) {
    const [nx, ny, nz] = dims
    const sx = (x) => (X_RIGHT_ON_SCREEN_RIGHT ? (nx - 1 - x) : x);
    const bg  = bgRef.current
    const map = mapRef.current

    const dimsStr = dims.join('x')
    const bgOK  = !!(bg  && bg.dims.join('x')  === dimsStr)
    const mapOK = !!(map && map.dims.join('x') === dimsStr)

    let w=0, h=0, getBG=null, getMap=null
    if (axis === 'z') { w = nx; h = ny; if (bgOK)  getBG  = (x,y)=> bg.data[sx(x) + y*nx + index*nx*ny]; if (mapOK) getMap = (x,y)=> map.data[sx(x) + y*nx + index*nx*ny] }
    if (axis === 'y') { w = nx; h = nz; if (bgOK)  getBG  = (x,y)=> bg.data[sx(x) + index*nx + y*nx*ny]; if (mapOK) getMap = (x,y)=> map.data[sx(x) + index*nx + y*nx*ny] }
    if (axis === 'x') { w = ny; h = nz; if (bgOK)  getBG  = (x,y)=> bg.data[index + x*nx + y*nx*ny]; if (mapOK) getMap = (x,y)=> map.data[index + x*nx + y*nx*ny] }

    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: false })
    const img = ctx.createImageData(w, h)

    const alpha = Math.max(0, Math.min(1, overlayAlpha))
    const R = 255, G = 0, B = 0
    const thr = mapThreshold

    const bgMin = bg?.min ?? 0
    const bgMax = bg?.max ?? 1
    const bgRange = (bgMax - bgMin) || 1

    let p = 0
    for (let yy=0; yy<h; yy++) {
      const srcY = h - 1 - yy
      for (let xx=0; xx<w; xx++) {
        let gray = 0
        if (getBG) {
          const vbg = getBG(xx, srcY)
          let g = (vbg - bgMin) / bgRange
          if (g < 0) g = 0
          if (g > 1) g = 1
          gray = (g * 255) | 0
        }
        img.data[p    ] = gray
        img.data[p + 1] = gray
        img.data[p + 2] = gray
        img.data[p + 3] = 255

        if (getMap) {
          let mv = getMap(xx, srcY)
          const raw = mv
          if (useAbs) mv = Math.abs(mv)
          let pass = (thr == null) ? (mv > 0) : (mv >= thr)
          if (posOnly && raw <= 0) pass = false
          if (pass) {
            img.data[p    ] = ((1 - alpha) * img.data[p]     + alpha * R) | 0
            img.data[p + 1] = ((1 - alpha) * img.data[p + 1] + alpha * G) | 0
            img.data[p + 2] = ((1 - alpha) * img.data[p + 2] + alpha * B) | 0
          }
        }
        p += 4
      }
    }
    ctx.putImageData(img, 0, 0)

    ctx.save()
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 1
    let cx = 0, cy = 0
    if (axis === 'z') {
      cx = Math.max(0, Math.min(w-1, (X_RIGHT_ON_SCREEN_RIGHT ? (w - 1 - ix) : ix)))
      cy = Math.max(0, Math.min(h-1, iy))
    } else if (axis === 'y') {
      cx = Math.max(0, Math.min(w-1, (X_RIGHT_ON_SCREEN_RIGHT ? (w - 1 - ix) : ix)))
      cy = Math.max(0, Math.min(h-1, iz))
    } else {
      cx = Math.max(0, Math.min(w-1, iy))
      cy = Math.max(0, Math.min(h-1, iz))
    }
    const screenY = h - 1 - cy
    ctx.beginPath(); ctx.moveTo(cx + 0.5, 0); ctx.lineTo(cx + 0.5, h); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, screenY + 0.5); ctx.lineTo(w, screenY + 0.5); ctx.stroke()
    ctx.restore()
  }

  function onCanvasClick (e, axis) {
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor((e.clientX - rect.left) * canvas.width / rect.width)
    const y = Math.floor((e.clientY - rect.top) * canvas.height / rect.height)
    const srcY = canvas.height - 1 - y
    const [nx,ny,nz] = dims
    
    const toIdxX = (screenX) => (X_RIGHT_ON_SCREEN_RIGHT ? (nx - 1 - screenX) : screenX);
    if (axis === 'z') { const xi = toIdxX(x); setIx(xi); setIy(srcY); setCx(String(idx2coord(xi, nx, 'x'))); setCy(String(idx2coord(srcY, ny, 'y'))) }
    else if (axis === 'y') { const xi = toIdxX(x); setIx(xi); setIz(srcY); setCx(String(idx2coord(xi, nx, 'x'))); setCz(String(idx2coord(srcY, nz, 'z'))) }
    else { setIy(x); setIz(srcY); setCy(String(idx2coord(x, ny, 'y'))); setCz(String(idx2coord(srcY, nz, 'z'))) }
  }

  useEffect(() => {
    const [nx,ny,nz] = dims
    if (!nx) return
    setCx(String(idx2coord(ix, nx, 'x')))
    setCy(String(idx2coord(iy, ny, 'y')))
    setCz(String(idx2coord(iz, nz, 'z')))
  }, [ix,iy,iz,dims])

  const commitCoord = (axis) => {
    const [nx,ny,nz] = dims
    let vStr = axis==='x' ? cx : axis==='y' ? cy : cz
    if (vStr === '' || vStr === '-' ) return
    const parsed = parseFloat(vStr)
    if (Number.isNaN(parsed)) return
    if (axis==='x') setIx(coord2idx(parsed, nx, 'x'))
    if (axis==='y') setIy(coord2idx(parsed, ny, 'y'))
    if (axis==='z') setIz(coord2idx(parsed, nz, 'z'))
  }

  useEffect(() => {
    const [nx, ny, nz] = dims
    if (!nx) return
    const c0 = canvases[0].current, c1 = canvases[1].current, c2 = canvases[2].current
    if (c0 && iz >=0 && iz < nz) drawSlice(c0, 'z', iz)
    if (c1 && iy >=0 && iy < ny) drawSlice(c1, 'y', iy)
    if (c2 && ix >=0 && ix < nx) drawSlice(c2, 'x', ix)
  }, [
    dims, ix, iy, iz,
    overlayAlpha, posOnly, useAbs, thrMode, pctl, thrValue,
    loadingBG, loadingMap, errBG, errMap, effectiveQuery
  ])

  const [nx, ny, nz] = dims

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
      <style>{`
        .nii-neon-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: repeat(2, 1fr);   /* ✅ 四格平均分配空間 */
          gap: 16px;
          width: 100%;
          height: 70vh;                         /* ✅ viewer 高度佔視窗七成，可自行微調 */
          align-items: stretch;
          justify-items: stretch;
        }

        .nii-neon-item {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 0;
          overflow: hidden;                /* ✅ 防止內容溢出格子 */
          background: rgba(10, 14, 26, 0.3);
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-radius: 16px;
          padding: 16px;
          transition: all 0.3s;
        }
        .nii-neon-item:hover {
          border-color: rgba(0, 240, 255, 0.5);
          box-shadow: 0 0 30px rgba(0, 240, 255, 0.3);
        }
      
        .nii-neon-label {
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 8px 14px;
          flex-shrink: 0;
          text-align: center;
          background: linear-gradient(135deg, var(--neon-cyan) 0%, var(--neon-purple) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-radius: 8px;
          background-color: rgba(0, 240, 255, 0.05);
        }
      
        .nii-quad-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0,240,255,0.15);
          border-radius: 12px;
          background: rgba(10,15,25,0.25);
          backdrop-filter: blur(10px);
          overflow: hidden;
          min-height: 0; 
        }

        /* === 腦圖：自動等比例縮放、永不被拉扯 === */
        .nii-neon-canvas {
          display: block;
          width: 90%;               /* ✅ 自動依格子寬縮放 */
          height: auto;             /* ✅ 保持比例 */
          max-width: 100%;         /* ✅ 加入這行 */
          max-height: 85%;         /* ✅ 從 95% 改為 85%,確保不超出 */
          object-fit: contain;      /* ✅ 保持完整比例顯示 */
          background: #000;
          border-radius: 12px;
          border: 2px solid rgba(0,240,255,0.4);
          box-shadow:
            0 0 20px rgba(0,240,255,0.3),
            inset 0 0 30px rgba(0,240,255,0.1);
          cursor: crosshair;
          transition: box-shadow 0.3s;
          margin: auto;
        }

        .nii-neon-canvas:hover {
          box-shadow:
            0 0 40px rgba(0,240,255,0.6),
            inset 0 0 30px rgba(0,240,255,0.2);
        }

        /* === 控制面板：固定卡片位置，自身滾動，不影響其他格子 === */
        .nii-controls-panel {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;             /* ✅ 占滿格子，但不拉其他格子 */
          overflow-y: auto;         /* ✅ 卡片內滾動 */
          padding: 12px;
          border-radius: 12px;
          background: rgba(10, 15, 25, 0.45);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(0,240,255,0.2);
          box-shadow: inset 0 0 20px rgba(0,240,255,0.1);
        }




        .nii-neon-controls {
          background: var(--bg-glass);
          backdrop-filter: blur(20px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 18px;
          overflow-y: auto;
          flex: 1;
          min-height: 0;
        }
        .nii-neon-control-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .nii-neon-control-label {
          font-size: 12px;
          font-weight: 700;
          color: var(--neon-cyan);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .nii-neon-control-input {
          width: 100%;
          padding: 10px 14px;
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-radius: 10px;
          font-size: 14px;
          background: rgba(30, 41, 59, 0.4);
          color: var(--text-primary);
          transition: all 0.3s;
        }
        .nii-neon-control-input:focus {
          outline: none;
          border-color: var(--neon-cyan);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
        }
        .nii-neon-coords {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          transition: all 0.3s;
        }
        .nii-neon-coord-input {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .nii-neon-coord-input label {
          font-size: 11px;
          color: var(--text-muted);
          font-weight: 600;
        }
        .nii-neon-slider {
          width: 100%;
          height: 8px;
          border-radius: 10px;
          background: rgba(30, 41, 59, 0.6);
          cursor: pointer;
          accent-color: var(--neon-cyan);
        }
        .nii-neon-slider::-webkit-slider-thumb {
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.8);
        }
        .nii-neon-divider {
          height: 1px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(0, 240, 255, 0.5) 50%, 
            transparent 100%);
          margin: 6px 0;
        }
        .nii-neon-checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .nii-neon-checkbox-label {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: color 0.3s;
        }
        .nii-neon-checkbox-label:hover {
          color: var(--neon-cyan);
        }
        .nii-neon-checkbox-label input {
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: var(--neon-cyan);
        }
        .nii-neon-checkbox-label input:checked {
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.8);
        }
        .nii-neon-download {
          padding: 12px 20px;
          text-align: center;
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-radius: 10px;
          background: rgba(0, 240, 255, 0.05);
          color: var(--neon-cyan);
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .nii-neon-download:hover {
          background: rgba(0, 240, 255, 0.15);
          border-color: var(--neon-cyan);
          box-shadow: 0 0 25px rgba(0, 240, 255, 0.5);
          transform: translateY(-2px);
        }
        .nii-neon-filter-badge {
          background: rgba(0, 255, 136, 0.15);
          border: 1px solid rgba(0, 255, 136, 0.4);
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          color: var(--neon-green);
          font-weight: 600;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>

      {selectedStudies.length > 0 && (
        <div className="nii-neon-filter-badge">
          <span>🔍</span>
          <span>Showing {selectedStudies.length} selected {selectedStudies.length === 1 ? 'study' : 'studies'}</span>
        </div>
      )}

      {(loadingBG || loadingMap) && (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', filter: 'drop-shadow(0 0 20px var(--neon-cyan))', animation: 'pulse 2s ease-in-out infinite' }}>
            🧠
          </div>
          <div style={{ fontSize: '16px', color: 'var(--neon-cyan)' }}>Loading brain data...</div>
        </div>
      )}

      {(errBG || errMap) && (
        <div style={{ padding: '16px 20px', background: 'rgba(255, 0, 110, 0.1)', border: '1px solid rgba(255, 0, 110, 0.3)', borderRadius: '12px', fontSize: '14px', color: 'var(--neon-pink)', boxShadow: '0 0 20px rgba(255, 0, 110, 0.3)' }}>
          {errBG && <div>Background: {errBG}</div>}
          {errMap && <div>Map: {errMap}</div>}
        </div>
      )}

      {!!nx && (
        <div className='nii-neon-grid'>
          {/* Top-left: Sagittal */}
          <div className='nii-neon-item'>
            <div className='nii-neon-label'>Sagittal (X)</div>
            <canvas ref={canvases[2]} className='nii-neon-canvas' onClick={(e)=>onCanvasClick(e, 'x')} />
          </div>

          {/* Top-right: Coronal */}
          <div className='nii-neon-item'>
            <div className='nii-neon-label'>Coronal (Y)</div>
            <canvas ref={canvases[1]} className='nii-neon-canvas' onClick={(e)=>onCanvasClick(e, 'y')} />
          </div>

          {/* Bottom-left: Axial */}
          <div className='nii-neon-item'>
            <div className='nii-neon-label'>Axial (Z)</div>
            <canvas ref={canvases[0]} className='nii-neon-canvas' onClick={(e)=>onCanvasClick(e, 'z')} />
          </div>

          {/* Bottom-right: Controls */}
          <div className='nii-neon-item'>
            <div className='nii-neon-label'>Controls</div>
            <div className='nii-neon-controls'>
              
              {/* Coordinates */}
              <div className='nii-neon-control-group'>
                <div className='nii-neon-control-label'>MNI Coordinates (mm)</div>
                <div className='nii-neon-coords'>
                  <div className='nii-neon-coord-input'>
                    <label>X</label>
                    <input
                      type='text'
                      value={cx}
                      onChange={e=>setCx(e.target.value)}
                      onBlur={()=>commitCoord('x')}
                      onKeyDown={e=>{ if(e.key==='Enter') commitCoord('x') }}
                      className='nii-neon-control-input'
                    />
                  </div>
                  <div className='nii-neon-coord-input'>
                    <label>Y</label>
                    <input
                      type='text'
                      value={cy}
                      onChange={e=>setCy(e.target.value)}
                      onBlur={()=>commitCoord('y')}
                      onKeyDown={e=>{ if(e.key==='Enter') commitCoord('y') }}
                      className='nii-neon-control-input'
                    />
                  </div>
                  <div className='nii-neon-coord-input'>
                    <label>Z</label>
                    <input
                      type='text'
                      value={cz}
                      onChange={e=>setCz(e.target.value)}
                      onBlur={()=>commitCoord('z')}
                      onKeyDown={e=>{ if(e.key==='Enter') commitCoord('z') }}
                      className='nii-neon-control-input'
                    />
                  </div>
                </div>
              </div>
              {/* Overlay Alpha */}
              <div className='nii-neon-control-group'>
                <div className='nii-neon-control-label'>Overlay Opacity: {overlayAlpha.toFixed(2)}</div>
                <input 
                  type='range' 
                  min='0' 
                  max='1' 
                  step='0.05' 
                  value={overlayAlpha} 
                  onChange={e=>setOverlayAlpha(Number(e.target.value))}
                  className='nii-neon-slider'
                />
              </div>

              {/* Checkboxes */}
              <div className='nii-neon-checkbox-group'>
                <label className='nii-neon-checkbox-label'>
                  <input type='checkbox' checked={posOnly} onChange={e=>setPosOnly(e.target.checked)} />
                  <span>Positive values only</span>
                </label>
                <label className='nii-neon-checkbox-label'>
                  <input type='checkbox' checked={useAbs} onChange={e=>setUseAbs(e.target.checked)} />
                  <span>Use absolute values</span>
                </label>
              </div>

              <div className='nii-neon-divider' />

              {/* Threshold Mode */}
              <div className='nii-neon-control-group'>
                <div className='nii-neon-control-label'>Threshold Mode</div>
                <select 
                  value={thrMode} 
                  onChange={e=>setThrMode(e.target.value)} 
                  className='nii-neon-control-input'
                >
                  <option value='value'>Value</option>
                  <option value='pctl'>Percentile</option>
                </select>
              </div>

              {thrMode === 'value' ? (
                <div className='nii-neon-control-group'>
                  <div className='nii-neon-control-label'>Threshold Value</div>
                  <input 
                    type='number' 
                    step='0.01' 
                    value={thrValue} 
                    onChange={e=>setThrValue(Number(e.target.value))} 
                    className='nii-neon-control-input' 
                  />
                </div>
              ) : (
                <div className='nii-neon-control-group'>
                  <div className='nii-neon-control-label'>Percentile: {pctl}%</div>
                  <input 
                    type='range' 
                    min='50' 
                    max='99.9' 
                    step='0.5' 
                    value={pctl} 
                    onChange={e=>setPctl(Number(e.target.value)||95)}
                    className='nii-neon-slider'
                  />
                </div>
              )}

              <div className='nii-neon-divider' />

 

              <div className='nii-neon-divider' />

              {/* FWHM */}
              <div className='nii-neon-control-group'>
                <div className='nii-neon-control-label'>Gaussian FWHM (mm)</div>
                <input 
                  type='number' 
                  step='0.5' 
                  value={fwhm} 
                  onChange={e=>setFwhm(Number(e.target.value)||0)} 
                  className='nii-neon-control-input' 
                />
              </div>

              {effectiveQuery && (
                <a 
                  href={mapUrl} 
                  download 
                  className='nii-neon-download'
                >
                  <span>📥</span>
                  <span>Download NIfTI Map</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default NiiViewer
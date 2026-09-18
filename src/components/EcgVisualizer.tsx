import React, { useEffect, useRef, useState } from 'react';
import { Activity, Play, Pause, RefreshCw } from 'lucide-react';

interface EcgVisualizerProps {
  bpm: number;
  isConnected: boolean;
}

export const EcgVisualizer: React.FC<EcgVisualizerProps> = ({ bpm, isConnected }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [sweepSpeed, setSweepSpeed] = useState<number>(2.5); // pixels per frame

  // Waveform state refs to avoid React re-renders on animation frame
  const animFrameRef = useRef<number | null>(null);
  const xPosRef = useRef<number>(0);
  const lastYRef = useRef<number | null>(null);
  const beatCycleRef = useRef<number>(0); // 0 to 1 progress within one beat

  // ECG P-Q-R-S-T wave model function
  // progress: 0 to 1 along a single heart beat cycle
  const getEcgOffset = (progress: number): number => {
    // Medical P-Q-R-S-T curve formula normalized
    if (progress < 0.1) {
      // Baseline before P wave
      return 0;
    } else if (progress < 0.2) {
      // P wave (atrial depolarization)
      const p = (progress - 0.1) / 0.1;
      return Math.sin(p * Math.PI) * 0.18;
    } else if (progress < 0.28) {
      // PR segment
      return 0;
    } else if (progress < 0.32) {
      // Q wave (septal depolarization, small negative dip)
      const q = (progress - 0.28) / 0.04;
      return -Math.sin(q * Math.PI) * 0.15;
    } else if (progress < 0.38) {
      // R wave (ventricular depolarization, sharp tall spike)
      const r = (progress - 0.32) / 0.06;
      return Math.sin(r * Math.PI) * 1.0;
    } else if (progress < 0.44) {
      // S wave (negative dip following R)
      const s = (progress - 0.38) / 0.06;
      return -Math.sin(s * Math.PI) * 0.35;
    } else if (progress < 0.52) {
      // ST segment
      return 0;
    } else if (progress < 0.72) {
      // T wave (ventricular repolarization, medium smooth wave)
      const t = (progress - 0.52) / 0.2;
      return Math.sin(t * Math.PI) * 0.3;
    } else {
      // TP interval (diastole baseline)
      return 0;
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = container.clientWidth || 600;
    let height = container.clientHeight || 200;

    const updateDimensions = () => {
      if (!container || !canvas) return;
      width = container.clientWidth;
      height = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        drawGrid(ctx, width, height);
      }
      xPosRef.current = 0;
      lastYRef.current = null;
    };

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });
    resizeObserver.observe(container);
    updateDimensions();

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const drawGrid = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = '#0f172a'; // slate-900 background
    ctx.fillRect(0, 0, w, h);

    // Subtle grid lines (standard medical 5mm/1mm scale)
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)'; // slate-800
    const step = 20;

    ctx.beginPath();
    for (let x = 0; x <= w; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Major grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
    ctx.beginPath();
    for (let x = 0; x <= w; x += step * 5) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let y = 0; y <= h; y += step * 5) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTimestamp = performance.now();

    const render = (now: number) => {
      const delta = (now - lastTimestamp) / 1000;
      lastTimestamp = now;

      if (!isPaused) {
        const container = containerRef.current;
        const w = container?.clientWidth || 600;
        const h = container?.clientHeight || 200;
        const midY = h / 2;
        const amplitude = h * 0.4;

        // Calculate progress along cardiac cycle
        // If connected and has BPM, 1 beat duration = 60 / BPM seconds
        const currentBpm = isConnected && bpm > 30 ? bpm : 0;
        const beatDuration = currentBpm > 0 ? 60 / currentBpm : 2.5;

        if (currentBpm > 0) {
          beatCycleRef.current = (beatCycleRef.current + delta / beatDuration) % 1.0;
        } else {
          // Flatline or mild baseline noise
          beatCycleRef.current = 0;
        }

        // Advance sweep
        const speed = sweepSpeed;
        const oldX = xPosRef.current;
        let newX = oldX + speed;

        // Erase ahead sweep zone (clean 18px bar ahead of current line)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(newX, 0, 20, h);

        // Redraw erased grid in that small region
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(30, 41, 59, 0.7)';
        const step = 20;
        const startGridX = Math.floor(newX / step) * step;
        ctx.beginPath();
        for (let gx = startGridX; gx <= newX + 22; gx += step) {
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, h);
        }
        for (let gy = 0; gy <= h; gy += step) {
          ctx.moveTo(newX, gy);
          ctx.lineTo(newX + 20, gy);
        }
        ctx.stroke();

        // Calculate Y coordinate
        let targetY = midY;
        if (currentBpm > 0) {
          const ecgVal = getEcgOffset(beatCycleRef.current);
          targetY = midY - ecgVal * amplitude + (Math.random() * 1.5 - 0.75); // tiny biological noise
        } else {
          // Flat line with faint baseline jitter
          targetY = midY + (Math.sin(now / 500) * 2 + (Math.random() * 1.0 - 0.5));
        }

        // Draw waveform line
        ctx.beginPath();
        ctx.strokeStyle = currentBpm > 140 ? '#f43f5e' : '#10b981'; // rose if high, emerald green normally
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = currentBpm > 140 ? 'rgba(244, 63, 94, 0.8)' : 'rgba(16, 185, 129, 0.8)';
        ctx.shadowBlur = 6;

        const prevY = lastYRef.current !== null ? lastYRef.current : targetY;
        ctx.moveTo(oldX, prevY);
        ctx.lineTo(newX, targetY);
        ctx.stroke();

        ctx.shadowBlur = 0; // reset shadow

        lastYRef.current = targetY;
        xPosRef.current = newX;

        // Loop around when reaching right boundary
        if (xPosRef.current >= w) {
          xPosRef.current = 0;
          lastYRef.current = null;
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [bpm, isConnected, isPaused, sweepSpeed]);

  const handleClear = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawGrid(ctx, container.clientWidth, container.clientHeight);
    xPosRef.current = 0;
    lastYRef.current = null;
  };

  return (
    <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 shadow-md flex flex-col justify-between">
      {/* Visualizer Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <h2 className="text-sm font-semibold text-slate-100 tracking-wide">
            实时心电示波器 (ECG Waveform)
          </h2>
          <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {isConnected && bpm > 0 ? `${bpm} BPM 节律同步` : '基线待机中'}
          </span>
        </div>

        {/* Oscilloscope Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            <button
              id="ecg-speed-normal-btn"
              type="button"
              onClick={() => setSweepSpeed(2.5)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                sweepSpeed === 2.5
                  ? 'bg-slate-700 text-emerald-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1x 速
            </button>
            <button
              id="ecg-speed-fast-btn"
              type="button"
              onClick={() => setSweepSpeed(4.0)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                sweepSpeed === 4.0
                  ? 'bg-slate-700 text-emerald-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2x 速
            </button>
          </div>

          <button
            id="ecg-pause-toggle-btn"
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title={isPaused ? '继续示波' : '暂停示波'}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>

          <button
            id="ecg-clear-canvas-btn"
            type="button"
            onClick={handleClear}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="清屏刷新"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-44 sm:h-52 rounded-xl overflow-hidden relative border border-slate-800/80 bg-slate-900"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        {/* Scale labels on top-right of canvas */}
        <div className="absolute top-2 right-2 flex flex-col items-end gap-0.5 pointer-events-none text-[10px] font-mono text-slate-500">
          <span>25mm/s • 10mm/mV</span>
          <span className="text-emerald-400/80">P-Q-R-S-T 标准心电模型</span>
        </div>
      </div>
    </div>
  );
};

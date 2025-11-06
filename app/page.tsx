"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const ANIMATION_DURATION = 14000;

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const cancelAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
  }, []);

  const drawFrame = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height * 0.58;

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max);
    const easeInOutCubic = (t: number) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeOutBack = (t: number) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    ctx.clearRect(0, 0, width, height);

    const backgroundGradient = ctx.createLinearGradient(0, 0, 0, height);
    backgroundGradient.addColorStop(0, "#0b0824");
    backgroundGradient.addColorStop(0.35, "#220d41");
    backgroundGradient.addColorStop(0.7, "#2b421a");
    backgroundGradient.addColorStop(1, "#06140a");
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, width, height);

    const twinkleCount = 40;
    ctx.save();
    for (let i = 0; i < twinkleCount; i++) {
      const phase = (progress * 6 + i * 0.1) % 1;
      const alpha = Math.sin(phase * Math.PI);
      ctx.globalAlpha = alpha * 0.25;
      ctx.fillStyle = "#f4eeff";
      const twinkleX = ((i * 503) % width) + (Math.sin(progress * 10 + i) * 8);
      const twinkleY = ((i * 233) % (height * 0.6)) + (Math.cos(progress * 7 + i) * 6);
      ctx.beginPath();
      ctx.arc(twinkleX, twinkleY, 1.5 + alpha * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const stemProgress = easeOutCubic(clamp(progress * 1.3, 0, 1));
    const stemTopY = centerY - stemProgress * height * 0.23;
    ctx.save();
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e6c31";
    ctx.beginPath();
    ctx.moveTo(centerX, height);
    ctx.bezierCurveTo(
      centerX - 30,
      height - height * 0.25,
      centerX + 12,
      height - height * 0.38,
      centerX,
      stemTopY
    );
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#2a8c3d";
    ctx.beginPath();
    ctx.moveTo(centerX + 5, height);
    ctx.bezierCurveTo(
      centerX - 10,
      height - height * 0.24,
      centerX + 24,
      height - height * 0.37,
      centerX + 3,
      stemTopY - 6
    );
    ctx.stroke();
    ctx.restore();

    const leafProgress = clamp((progress - 0.12) * 1.5, 0, 1);
    const drawLeaf = (offsetAngle: number, flip = 1) => {
      const leafOpen = easeOutBack(leafProgress);
      if (leafOpen <= 0) return;
      ctx.save();
      ctx.translate(centerX, height - height * 0.28);
      ctx.rotate((offsetAngle * Math.PI) / 180);
      ctx.scale(flip, 1);
      ctx.fillStyle = "#2a8c3d";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(65, -24 * leafOpen, 90, -2);
      ctx.quadraticCurveTo(65, 22 * leafOpen, 0, 0);
      ctx.fill();
      ctx.fillStyle = "#1f6c2c";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(55, -18 * leafOpen, 85, -2);
      ctx.quadraticCurveTo(55, 18 * leafOpen, 0, 0);
      ctx.fill();
      ctx.restore();
    };
    drawLeaf(-28, 1);
    drawLeaf(34, -1);

    const drawPetal = (
      angle: number,
      petalProgress: number,
      radius: number,
      widthFactor: number,
      hueShift: number
    ) => {
      if (petalProgress <= 0) return;
      const opened = easeOutBack(petalProgress);
      ctx.save();
      ctx.translate(centerX, stemTopY);
      ctx.rotate(angle);
      ctx.scale(1, 1.1);
      const gradient = ctx.createLinearGradient(0, 0, 0, -radius);
      gradient.addColorStop(0, `hsl(${345 + hueShift}, 80%, 45%)`);
      gradient.addColorStop(0.5, `hsl(${350 + hueShift}, 90%, 55%)`);
      gradient.addColorStop(1, `hsl(${355 + hueShift}, 95%, 65%)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(
        radius * 0.18 * widthFactor,
        -radius * 0.12,
        radius * 0.45 * widthFactor,
        -radius * 0.55 * opened,
        0,
        -radius * opened
      );
      ctx.bezierCurveTo(
        -radius * 0.45 * widthFactor,
        -radius * 0.55 * opened,
        -radius * 0.18 * widthFactor,
        -radius * 0.12,
        0,
        0
      );
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    };

    const petalLayers = [
      { count: 5, radius: 140, width: 1.06, offset: 0.0 },
      { count: 7, radius: 112, width: 0.94, offset: 0.08 },
      { count: 9, radius: 88, width: 0.78, offset: 0.16 }
    ];

    petalLayers.forEach((layer, layerIndex) => {
      for (let i = 0; i < layer.count; i++) {
        const angle = (i / layer.count) * Math.PI * 2 + layerIndex * 0.4;
        const growthStart = layer.offset + i * 0.012;
        const growthEnd = growthStart + 0.48;
        const localProgress = clamp((progress - growthStart) / (growthEnd - growthStart), 0, 1);
        drawPetal(angle, localProgress, layer.radius, layer.width, layerIndex * 2);
      }
    });

    const coreProgress = easeInOutCubic(clamp((progress - 0.08) * 1.4, 0, 1));
    ctx.save();
    ctx.translate(centerX, stemTopY);
    const coreRadius = 32 * coreProgress;
    const coreGradient = ctx.createRadialGradient(0, -8, 6, 0, 0, coreRadius);
    coreGradient.addColorStop(0, "#ffb3c6");
    coreGradient.addColorStop(0.3, "#ff99b0");
    coreGradient.addColorStop(1, "#f74f78");
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const shimmerCount = 120;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < shimmerCount; i++) {
      const localSeed = (i * 37) % 360;
      const petalAngle = (localSeed / shimmerCount) * Math.PI * 2;
      const distance = 40 + ((localSeed * 13) % 70);
      const shimmerPhase = (progress * 4 + localSeed * 0.03) % 1;
      const shimmerAlpha = Math.max(0, Math.sin(shimmerPhase * Math.PI));
      ctx.globalAlpha = shimmerAlpha * 0.07;
      const x = centerX + Math.cos(petalAngle) * distance;
      const y = stemTopY + Math.sin(petalAngle) * distance * 0.8;
      ctx.beginPath();
      ctx.arc(x, y, 10 + shimmerAlpha * 12, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 182, 193, 0.6)";
      ctx.fill();
    }
    ctx.restore();
  }, []);

  const playAnimation = useCallback(
    (onComplete?: () => void) => {
      const start = performance.now();
      cancelAnimation();
      const loop = (time: number) => {
        const elapsed = time - start;
        const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
        drawFrame(progress);
        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(loop);
        } else {
          onComplete?.();
        }
      };
      animationFrameRef.current = requestAnimationFrame(loop);
    },
    [cancelAnimation, drawFrame]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      playAnimation();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimation();
    };
  }, [cancelAnimation, playAnimation]);

  const handleReplay = useCallback(() => {
    playAnimation();
  }, [playAnimation]);

  const handleDownload = useCallback(async () => {
    if (isRecording) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    setVideoUrl(undefined);
    setIsRecording(true);
    recordedChunksRef.current = [];

    const stream = canvas.captureStream(60);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp9"
    });
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setIsRecording(false);
    };

    recorder.start();
    playAnimation(() => {
      setTimeout(() => {
        recorder.stop();
      }, 300);
    });
  }, [isRecording, playAnimation]);

  return (
    <main className="page">
      <section className="hero">
        <div className="overlay" />
        <div className="content">
          <h1>Bông Hồng Nở Rộ</h1>
          <p>Xem hành trình từ nụ tới đóa hồng rực rỡ và tải video làm kỷ niệm.</p>
          <div className="controls">
            <button type="button" onClick={handleReplay}>
              Phát lại
            </button>
            <button type="button" onClick={handleDownload} disabled={isRecording}>
              {isRecording ? "Đang ghi..." : "Ghi video"}
            </button>
            {videoUrl ? (
              <a href={videoUrl} download="rose-bloom.webm">
                Tải về
              </a>
            ) : null}
          </div>
        </div>
        <div className="canvas-wrapper">
          <canvas ref={canvasRef} />
        </div>
      </section>
    </main>
  );
}

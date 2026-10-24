"use client";

/* eslint-disable @next/next/no-img-element -- selfies are data URLs, which next/image cannot render */

import { useEffect, useId, useRef, useState } from "react";

async function compressSource(
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  let edge = 360;
  let url = "";
  for (let pass = 0; pass < 4; pass += 1) {
    const scale = Math.min(1, edge / Math.max(width, height, 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare the photo.");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    let quality = 0.7;
    url = canvas.toDataURL("image/jpeg", quality);
    while (url.length > 42000 && quality > 0.36) {
      quality -= 0.08;
      url = canvas.toDataURL("image/jpeg", quality);
    }
    if (url.length <= 42000) return url;
    edge = Math.round(edge * 0.7);
  }
  return url;
}

async function compressFile(file: Blob) {
  const original = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that photo."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const picture = new Image();
    picture.onload = () => resolve(picture);
    picture.onerror = () => reject(new Error("Could not read that photo."));
    picture.src = original;
  });
  return compressSource(image, image.naturalWidth, image.naturalHeight);
}

export function SelfieCapture({
  value,
  onChange,
}: {
  value: string;
  onChange: (dataUrl: string) => void;
}) {
  const fileId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestId = useRef(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [readyToSnap, setReadyToSnap] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function stopCamera() {
    requestId.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraStream(null);
    setIsCameraOpen(false);
    setReadyToSnap(false);
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!isCameraOpen || !cameraStream || !video) return;

    let cancelled = false;
    video.srcObject = cameraStream;

    function markReady() {
      if (cancelled || !video) return;
      if (video.videoWidth > 0 && video.videoHeight > 0) setReadyToSnap(true);
    }

    video.addEventListener("loadedmetadata", markReady);
    void video.play().then(markReady).catch(() => {
      if (!cancelled) {
        setError("The camera picture did not start. Use Or Upload Photo File instead.");
      }
    });

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", markReady);
    };
  }, [isCameraOpen, cameraStream]);

  async function openCamera() {
    setError(null);
    setReadyToSnap(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser has no live camera here. Use Or Upload Photo File instead.");
      return;
    }
    const ticket = ++requestId.current;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (ticket !== requestId.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraStream(stream);
      setIsCameraOpen(true);
    } catch {
      if (ticket === requestId.current) {
        setError("The camera did not open. Use Or Upload Photo File instead.");
      }
    }
  }

  async function snap() {
    const video = videoRef.current;
    const frame = canvasRef.current;
    if (!video || !frame || video.videoWidth < 2 || video.videoHeight < 2) {
      setError("Wait for your face to appear, then snap the photo.");
      return;
    }
    frame.width = video.videoWidth;
    frame.height = video.videoHeight;
    const context = frame.getContext("2d");
    if (!context) {
      setError("Could not save the photo.");
      return;
    }
    context.save();
    context.translate(frame.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, frame.width, frame.height);
    context.restore();
    try {
      const dataUrl = await compressSource(frame, frame.width, frame.height);
      onChange(dataUrl);
      stopCamera();
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save the photo.");
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      onChange(await compressFile(file));
      stopCamera();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not use that photo.");
    }
  }

  function retake() {
    stopCamera();
    void openCamera();
  }

  const showPreview = Boolean(value) && !isCameraOpen;

  return (
    <div>
      <p className="text-base font-bold text-navy">Live face photo</p>
      <p className="mt-1 text-base leading-relaxed">
        Look at the camera. We keep a small photo so the committee can match
        the person who collects the tickets.
      </p>
      {showPreview ? (
        <img
          src={value}
          alt="Face photo of the head of household"
          className="mt-4 h-36 w-36 rounded-full border-4 border-navy object-cover"
        />
      ) : null}
      {isCameraOpen ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            if (video.videoWidth > 0 && video.videoHeight > 0) setReadyToSnap(true);
          }}
          className="mt-4 w-full h-64 object-cover rounded-xl bg-black transform -scale-x-100"
        />
      ) : null}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      <div className="mt-4 flex flex-col gap-3">
        {isCameraOpen ? (
          <>
            <button
              type="button"
              disabled={!readyToSnap}
              onClick={() => void snap()}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald px-5 text-base font-bold text-white disabled:bg-slate-400"
            >
              📸 Capture Photo Now
            </button>
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-slate-300 px-5 text-base font-bold text-navy"
            >
              Cancel Camera
            </button>
          </>
        ) : showPreview ? (
          <button
            type="button"
            onClick={retake}
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-navy px-5 text-base font-bold text-white"
          >
            🔄 Retake Photo
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void openCamera()}
            className="inline-flex min-h-12 items-center justify-center rounded-lg bg-navy px-5 text-base font-bold text-white"
          >
            Open Camera &amp; Snap Face
          </button>
        )}
        {isCameraOpen ? null : (
          <label
            htmlFor={fileId}
            className="inline-flex min-h-12 cursor-pointer items-center justify-center rounded-lg border-2 border-navy bg-white px-5 text-base font-bold text-navy"
          >
            📁 Or Upload Photo File
          </label>
        )}
        <input
          id={fileId}
          type="file"
          accept="image/*"
          capture="user"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void onFile(file);
          }}
        />
      </div>
      {isCameraOpen && !readyToSnap ? (
        <p className="mt-3 text-base font-semibold text-navy">
          Waiting for the live camera picture…
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-base font-semibold text-navy" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

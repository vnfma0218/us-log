import React from "react";
import {
  AbsoluteFill,
  Composition,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type SlideshowProps = {
  images: string[];
  durationSec: number;
};

const FPS = 30;
const WIDTH = 1280;
const HEIGHT = 720;

function ZoomInImage({ src, clipFrames }: { src: string; clipFrames: number }) {
  const frame = useCurrentFrame();
  const zoomInFrames = Math.max(18, Math.floor(clipFrames * 0.85));
  const zoomProgress = interpolate(frame, [0, zoomInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const currentScale = interpolate(zoomProgress, [0, 1], [0.12, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${currentScale})`,
        transformOrigin: "center center",
      }}
    >
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </AbsoluteFill>
  );
}

function SlideshowVideo({ images }: SlideshowProps) {
  const { durationInFrames } = useVideoConfig();
  const safeImages = images.length > 0 ? images : [];
  if (safeImages.length === 0) {
    return (
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#111827",
          color: "white",
          fontSize: 48,
          fontFamily: "sans-serif",
        }}
      >
        No Images
      </AbsoluteFill>
    );
  }

  const clipFrames = Math.max(1, Math.floor(durationInFrames / safeImages.length));

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {safeImages.map((image, index) => {
        const from = index * clipFrames;
        const remaining = durationInFrames - from;
        const thisDuration = index === safeImages.length - 1 ? remaining : clipFrames;
        return (
          <Sequence key={`${index}-${image.slice(0, 32)}`} from={from} durationInFrames={thisDuration}>
            <ZoomInImage src={image} clipFrames={thisDuration} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MemorySlideshow"
      component={SlideshowVideo}
      durationInFrames={FPS * 30}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{
        images: [],
        durationSec: 30,
      }}
      calculateMetadata={({ props }) => {
        const durationInFrames = Math.max(1, Math.round(props.durationSec * FPS));
        return {
          durationInFrames,
          fps: FPS,
          width: WIDTH,
          height: HEIGHT,
        };
      }}
    />
  );
};

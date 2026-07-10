import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import Player from "./Player";

const PLAYER_1_COLOR = "#ffffff";
const PLAYER_2_COLOR = "#1e40af";
const COURT_HALF_LENGTH = 7;
const COURT_HALF_WIDTH = 3.5;

export default function TennisScene() {
  const ballRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (!ballRef.current) return;
    // volleys back and forth over the net, roughly following each rally swing
    ballRef.current.position.z = Math.sin(t * 0.5) * COURT_HALF_LENGTH * 0.8;
    ballRef.current.position.x = Math.sin(t * 0.5 + Math.PI / 2) * 1.5;
    ballRef.current.position.y = 0.5 + Math.abs(Math.sin(t * 1.0)) * 1.4;
  });

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 8, 4]} intensity={1} />

      {/* grass court */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[COURT_HALF_WIDTH * 2 + 3, COURT_HALF_LENGTH * 2 + 3]} />
        <meshStandardMaterial color="#2f6b3c" />
      </mesh>
      {/* court boundary lines */}
      <mesh position={[0, -0.49, -COURT_HALF_LENGTH]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[COURT_HALF_WIDTH * 2, 0.08]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, -0.49, COURT_HALF_LENGTH]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[COURT_HALF_WIDTH * 2, 0.08]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-COURT_HALF_WIDTH, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, COURT_HALF_LENGTH * 2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[COURT_HALF_WIDTH, -0.49, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.08, COURT_HALF_LENGTH * 2]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* net */}
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[COURT_HALF_WIDTH * 2 + 0.6, 0.5, 0.05]} />
        <meshStandardMaterial color="#e5e7eb" transparent opacity={0.85} />
      </mesh>

      <Player
        color={PLAYER_1_COLOR}
        animation="run"
        scale={0.55}
        sway={{ base: [0, 0, -COURT_HALF_LENGTH + 1.2], axis: "x", amplitude: 1.6, speed: 0.5, offset: 0, facingY: 0 }}
      />
      <Player
        color={PLAYER_2_COLOR}
        animation="run"
        scale={0.55}
        sway={{
          base: [0, 0, COURT_HALF_LENGTH - 1.2],
          axis: "x",
          amplitude: 1.6,
          speed: 0.5,
          offset: Math.PI,
          facingY: Math.PI,
        }}
      />

      <mesh ref={ballRef}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color="#d4f04c" />
      </mesh>
    </>
  );
}

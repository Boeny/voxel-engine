import { Camera, Vector3, WebGLRenderer } from 'three';

import mapData from '@/data/map.json';
import { keys, setupKeyboardEvents } from '@/events';
import { AppState } from '@/store';

import { Controller } from './controller';
import { PointerLock } from './pointerLock';
import { SelectableObject } from './selectableObject';
import { add, arrayToVector, getDistanceText, mul, norm, setDOMContent, sub } from './utils';

export class PlayerController extends Controller<AppState> {
  // components
  pointerLock = new PointerLock();

  // state
  velocity = new Vector3();
  isGrounded = true;
  private pitch = 0;
  private lastForward = new Vector3(0, 0, 1); // forward on tangent plane, persists between frames

  // config
  speed = 5; // m/s
  gravity = 10; // m/s2
  jumpForce = 0.005;
  playerHeight = 2; // m

  constructor(camera: Camera, getState: () => AppState) {
    super(camera, getState);

    // Spawn on planet surface along +Y (dayside when star is above)
    const planetPos = arrayToVector(mapData.planet.position);
    const spawnDir = new Vector3(0, 1, 0);
    camera.position.copy(planetPos).addScaledVector(spawnDir, mapData.planet.radius + this.playerHeight / 1000);

    // Orient camera: stand on surface, look along Z
    camera.up.copy(spawnDir);
    camera.lookAt(add(camera.position, new Vector3(0, 0, 1)));
  }

  switchMenu() {
    if (this.state.gameState === 'paused') {
      this.state.setGameState('playing');
    }
  }

  onMouseUnlock() {
    this.state.setGameState('paused');
  }

  onGameStateChange(renderer: WebGLRenderer): void {
    if (this.state.gameState === 'playing') {
      this.pointerLock.requestPointerLock(renderer.domElement);
    }
  }

  setupEvents() {
    const cleanupKeyboardEvents = setupKeyboardEvents({
      keydown: (e) => {
        if (e.code === 'Escape') {
          this.switchMenu();
        }
      },
    });
    const cleanupMouseEvents = this.pointerLock.setupEvents({
      onPointerLockChange: (isLocked) => {
        if (!isLocked) {
          this.onMouseUnlock();
        }
      },
    });

    return () => {
      cleanupKeyboardEvents();
      cleanupMouseEvents();
    };
  }

  getTerrainHeight() {
    return 0;
  }

  update(delta: number, selectedObject: SelectableObject | null) {
    if (!selectedObject) {
      this.isGrounded = false;
      this.camera.position.add(this.velocity);

      return;
    }

    // Local surface frame
    const up = norm(sub(this.camera.position, selectedObject.position));

    // ── Mouse look in local frame ───────────────────────────────
    const yawDelta = -this.pointerLock.mouseDelta.x * this.pointerLock.sensitivity;
    const pitchDelta = -this.pointerLock.mouseDelta.y * this.pointerLock.sensitivity;
    this.pointerLock.mouseDelta.x = 0;
    this.pointerLock.mouseDelta.y = 0;

    // Project stored forward onto current tangent plane (handles planet rotation)
    let forward = this.lastForward.clone().addScaledVector(up, -this.lastForward.dot(up));
    if (forward.lengthSq() < 0.001) {
      const ref = Math.abs(up.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1);
      forward = ref.clone().addScaledVector(up, -ref.dot(up));
    }
    forward.normalize();

    // Apply yaw (rotate forward around local up)
    forward.applyAxisAngle(up, yawDelta);
    this.lastForward.copy(forward);

    // Apply pitch with clamping
    const limit = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch + pitchDelta));

    // Build look direction from stored forward + pitch
    const newLookDir = forward.clone().multiplyScalar(Math.cos(this.pitch)).addScaledVector(up, Math.sin(this.pitch));

    // Set camera orientation
    this.camera.up.copy(up);
    this.camera.lookAt(this.camera.position.clone().add(newLookDir));

    // ── Movement in tangent plane ───────────────────────────────
    const right = new Vector3().crossVectors(forward, up).normalize();

    const moveDir = new Vector3();
    if (keys['KeyW']) {
      moveDir.add(forward);
    }
    if (keys['KeyS']) {
      moveDir.sub(forward);
    }
    if (keys['KeyD']) {
      moveDir.add(right);
    }
    if (keys['KeyA']) {
      moveDir.sub(right);
    }

    // Friction
    const tangentVel = this.velocity.clone().addScaledVector(up, -this.velocity.dot(up));
    const radialVel = up.clone().multiplyScalar(this.velocity.dot(up));
    tangentVel.multiplyScalar(Math.pow(0.5, delta * 60));
    this.velocity.copy(tangentVel).add(radialVel);

    // Acceleration
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize().multiplyScalar((this.speed / 1000) * delta);
      this.velocity.add(moveDir);
    }

    // Gravity
    const gravityVector = mul(up, -(this.gravity / 1000) * delta);
    this.velocity.add(gravityVector);

    // Apply velocity
    this.camera.position.add(this.velocity);

    // Recompute normal after position change
    const vectorFromObject = sub(this.camera.position, selectedObject.position);
    const newNormal = norm(vectorFromObject);

    // Ground collision
    const distanceToCameraOnGround = selectedObject.radius + this.playerHeight / 1000;
    this.isGrounded = vectorFromObject.length() <= distanceToCameraOnGround;
    if (this.isGrounded) {
      this.camera.position.copy(add(selectedObject.position, mul(newNormal, distanceToCameraOnGround)));
      const verticalVelocity = mul(newNormal, this.velocity.dot(newNormal));
      this.velocity.sub(verticalVelocity);
    }

    // Jump
    if (keys['Space'] && this.isGrounded) {
      this.isGrounded = false;
      this.velocity.add(mul(newNormal, this.jumpForce));
    }
  }

  updateHUD(selectedObject: SelectableObject | null) {
    setDOMContent('hud-altitude', `Altitude: ${getDistanceText(this.getDistanceToObject(selectedObject) * 1000 - this.playerHeight)}`);
    setDOMContent('hud-speed', `Speed: ${getDistanceText(this.velocity.length() * 1000)}/s`);
    setDOMContent('hud-grounded', `Is Grounded: ${this.isGrounded}`);
  }
}

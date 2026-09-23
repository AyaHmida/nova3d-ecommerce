import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements AfterViewInit, OnDestroy {
  @ViewChild('productCanvas') private readonly canvas?: ElementRef<HTMLCanvasElement>;

  loading = true;
  loadError = false;

  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
  private readonly renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  private readonly loader = new GLTFLoader();
  private controls?: OrbitControls;
  private model?: THREE.Object3D;
  private resizeObserver?: ResizeObserver;
  private animationFrameId?: number;
  private autoRotateTimeout?: ReturnType<typeof setTimeout>;

  ngAfterViewInit(): void {
    const canvas = this.canvas?.nativeElement;

    if (!canvas) {
      return;
    }

    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    canvas.replaceWith(this.renderer.domElement);
    this.renderer.domElement.className = 'product-canvas';
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D view of the Nova lounge chair');

    this.addLights();
    this.setupControls();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.renderer.domElement.parentElement ?? this.renderer.domElement);
    this.resize();
    this.loadModel();
    this.animate();
  }

  ngOnDestroy(): void {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
    }

    if (this.autoRotateTimeout) {
      clearTimeout(this.autoRotateTimeout);
    }

    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.disposeObject(this.model);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x171717, 2.1));

    const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
    keyLight.position.set(4, 6, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xb8c8ff, 2.2);
    fillLight.position.set(-5, 2, 4);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd9b0, 3.2);
    rimLight.position.set(2, 5, -6);
    this.scene.add(rimLight);
  }

  private setupControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enableZoom = true;
    this.controls.enableRotate = true;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.7;
    this.controls.minDistance = 1.35;
    this.controls.maxDistance = 4.5;
    this.controls.minPolarAngle = Math.PI * 0.25;
    this.controls.maxPolarAngle = Math.PI * 0.56;

    this.controls.addEventListener('start', () => {
      if (this.autoRotateTimeout) {
        clearTimeout(this.autoRotateTimeout);
      }
      this.controls!.autoRotate = false;
    });

    this.controls.addEventListener('end', () => {
      this.autoRotateTimeout = setTimeout(() => {
        if (this.controls) {
          this.controls.autoRotate = true;
        }
      }, 1400);
    });
  }

  private loadModel(): void {
    this.loader.load(
      '/models/nova-chair.glb',
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);
        const scale = 1.65 / maxDimension;

        model.position.copy(center).multiplyScalar(-scale);
        model.scale.setScalar(scale);
        model.position.y = -0.2;
        this.model = model;
        this.scene.add(model);
        this.camera.position.set(0, 0.8, 3.05);
        this.controls?.target.set(0, 0.1, 0);
        this.controls?.update();
        this.loading = false;
      },
      undefined,
      () => {
        this.loading = false;
        this.loadError = true;
      },
    );
  }

  private resize(): void {
    const parent = this.renderer.domElement.parentElement;

    if (!parent) {
      return;
    }

    const width = Math.max(parent.clientWidth, 1);
    const height = Math.max(parent.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.controls?.update();
    this.renderer.render(this.scene, this.camera);
  };

  private disposeObject(object?: THREE.Object3D): void {
    object?.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => material.dispose());
      }
    });
  }
}

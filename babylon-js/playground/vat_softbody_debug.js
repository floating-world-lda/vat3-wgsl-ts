var vat = document.createElement("script");
vat.src = "https://api.floatingworld.pt/public/vat3-babylonjs/0.1.3/index.js";
vat.type = "module";
document.head.appendChild(vat);

const fixedTimeAccumulator = (fps) => {
  const frameDuration = 1 / fps;
  let accumulator = 0;
  let animationTime = 0;

  return (deltaTime) => {
    accumulator += deltaTime;
    if (accumulator >= frameDuration) {
      animationTime += frameDuration;
      accumulator -= frameDuration;
      return animationTime;
    }
    return null;
  };
};

const hdrAssetsRoot =  "https://raw.githubusercontent.com/floating-world-lda/vat3-wgsl-ts/main/examples/";

const originalDispose = BABYLON.BaseTexture.prototype.dispose;

BABYLON.BaseTexture.prototype.dispose = function () {
  console.warn("TEXTURE DISPOSED:", this.name);
  console.trace();
  return originalDispose.apply(this, arguments);
};

const originalPipeline = GPUDevice.prototype.createRenderPipeline;

GPUDevice.prototype.createRenderPipeline = function(desc) {
    if (desc.vertex?.buffers) {
        desc.vertex.buffers.forEach((buffer, i) => {
            console.log(
                `BUFFER ${i}`,
                JSON.stringify(buffer, null, 2)
            );
        });
    }

    console.log("🔥 PIPELINE DESC:", JSON.parse(JSON.stringify(desc, (_, v) =>
    typeof v === "bigint" ? v.toString() : v
    )));

    if (desc.vertex?.buffers) {
        console.log("🔥 VERTEX BUFFERS:", desc.vertex.buffers);
    }

    return originalPipeline.call(this, desc);
};

export const createScene = function () {
    engine.disableUniformBuffers = true;
    engine.disableVertexArrayObjects = true;
    engine.enableOfflineSupport = false;
    engine.enableGPUDebug = true;

    BABYLON.Engine.InsideWorker = false;

    engine.onWebGPUPipelineCreationObservable?.add((p) => {
      console.log("🔥 PIPELINE DESC:", p);
    });

    var scene = new BABYLON.Scene(engine);

    var camera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(0, 5, -10), scene);
    camera.position.set(new BABYLON.Vector3(0, 3, -8));
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(canvas, true);

    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: 6, height: 6}, scene);

    vat.onload = async function() {
        console.log(`VAT3: loaded`);

        await VAT3.initialize();
        console.log(`VAT3: initialized`);

        const hdrAssets = await VAT3.loadAssets(
            scene,
            hdrAssetsRoot,
            "flag_HDR"
        )

        const loadedMesh = hdrAssets.mesh;
        console.log("BASE VERTEX BUFFERS:", loadedMesh.getVerticesDataNames?.())
        ;
        loadedMesh.disableAttributeOptimization = true;

        const hdrSoftbody = VAT3.create(
            scene,
            hdrAssets,
            VatType.Softbody
        )

        const mesh = hdrSoftbody.mesh;
        const material = hdrSoftbody.material;
        material.disableAttributeOptimization = true;

        console.log("MESH", mesh.name);

        console.log("AFTER VAT VERTEX BUFFERS:", mesh.getVerticesDataNames?.());

        console.log(
          "VERTEX KINDS",
          mesh.getVerticesDataKinds()
        );

        for (const kind of mesh.getVerticesDataKinds()) {
          const data = mesh.getVerticesData(kind);

          console.log(kind, {
            count: data?.length,
            stride: mesh.getVertexBuffer(kind)?.getSize(),
            instanced: mesh.getVertexBuffer(kind)?.getIsInstanced?.()
          });
        }

        const effect = material.getEffect();
        console.log("EFFECT:", effect);
        
        console.log("ATTRIBUTES:", effect?._attributes);
        console.log("INPUTS:", effect?._vertexDeclaration);
        console.log("VERTEX STRIDE:", effect?._vertexStride);

        const timeAccumulator = fixedTimeAccumulator(30);

        scene.onBeforeRenderObservable.add(() => {
            const engine = scene.getEngine();
            const deltaTime = engine.getDeltaTime() / 1000;

            const t = this._timeAccumulator?.(deltaTime);
            if (t === null || t === undefined) {
                return;
            }

            hdrSoftbody.time = t;
        });

        hdrSoftbody.setEnabled(true);
    };
    return scene;
};
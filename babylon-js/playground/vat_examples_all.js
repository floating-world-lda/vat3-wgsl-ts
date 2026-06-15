const VAT_MODULE_PATH = "https://api.floatingworld.pt/public/vat3-babylonjs/1.0.3/index.js";

const loadVatModule = (src) => new Promise((resolve, reject) => {
	const script = document.createElement("script");
	script.src = src;
	script.onload = () => resolve(script);
	script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
	document.head.appendChild(script);
});

const VAT_ASSETS_ROOT = "https://floatingworld-vat3-examples.s3.amazonaws.com/examples/";

const applyTextures = (item, enabled) => {
	const { instance, textures } = item;

	if (enabled) {
		for (const textureDef of textures ?? []) {
			if (textureDef.texture) instance.material[textureDef.target] = textureDef.texture;
		}
	}
};

const createNavigationUI = (scene, onNavigate) => {
	const ui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("ui");

	const root = new BABYLON.GUI.StackPanel();
	root.height = "80px";
	root.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
	root.isVertical = false;
	root.paddingBottom = "32px";
	root.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;

	ui.addControl(root);

	const createButton = (forward) => {
		const button = new BABYLON.GUI.Ellipse();
		button.background = "black";
		button.color = "black";
		button.height = "42px";
		button.width = "42px";

		const icon = new BABYLON.GUI.Image(
			forward ? "forwardIcon" : "backIcon",
			"textures/icons/Play.png"
		);
		icon.height = "36px";
		icon.thickness = 20;
		icon.width = "36px";

		if (!forward) {
			icon.leftInPixels = -2;
			icon.rotation = Math.PI;
		} else {
			icon.leftInPixels = 2;
		}

		button.addControl(icon);
		button.onPointerClickObservable.add(() => onNavigate(forward));

		return button;
	};

	const banner = new BABYLON.GUI.Rectangle();
	banner.background = "white";
	banner.color = "black";
	banner.height = "56px";
	banner.paddingLeftInPixels = 8;
	banner.paddingRightInPixels = 8;
	banner.thickness = 8;
	banner.width = "320px";

	const text = new BABYLON.GUI.TextBlock();
	text.color = "black";
	text.fontSize = 24;
	text.text = "";

	banner.addControl(text);

	root.addControl(createButton(false));
	root.addControl(banner);
	root.addControl(createButton(true));

	return { setTextFn: (t) => (text.text = t) };
};

const createVatController = (scene, camera, items) => {
	let activeIndex = 0;
	let activeItem = undefined;

	const activate = async (index) => {
		const previous = activeItem;
		const item = await loadVatItem(scene, items[index]);

		if (previous) setItemEnabled(previous, false);
		setItemEnabled(item, true);
		frameCameraToMesh(camera, item.instance.mesh);

		activeIndex = index;
		activeItem = item;
		return item;
	};

	const navigate = (forward) => {
		const next = forward
			? (activeIndex + 1) % items.length
			: (activeIndex - 1 + items.length) % items.length;
		return activate(next);
	};

	const update = (t) => activeItem?.instance?.update(t);

	return { activate, navigate, update };
};

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

const frameCameraToMesh = (camera, mesh) => {
	mesh.computeWorldMatrix(true);
	const { min, max } = mesh.getHierarchyBoundingVectors(true);
	const center = BABYLON.Vector3.Center(min, max);
	const size = max.subtract(min);
	const maxDim = Math.max(size.x, size.y, size.z);

	camera.target = center;
	camera.radius = maxDim * 2;
	camera.minZ = maxDim * 0.001;
	camera.maxZ = maxDim * 100;
};

const loadTextures = async (scene, item) => {
	const assetsRoot = item.assetsRoot ?? VAT_ASSETS_ROOT;

	for (const textureDef of item.textures ?? []) {
		if (textureDef.texture) continue;

		const url = `${assetsRoot}textures/${textureDef.url}`;

		try {
			textureDef.texture = await new Promise((resolve, reject) => {
				const tex = new BABYLON.Texture(
					url,
					scene,
					undefined,
					undefined,
					undefined,
					() => resolve(tex),
					(message, exception) => reject(new Error(`Failed to load texture "${url}": ${message ?? exception}`))
				);
				tex.hasAlpha = true;
			});
		} catch (error) {
			console.warn(error);
		}
	}
};

const loadVatItem = async (scene, item) => {
	if (!item.assets) {
		item.assets = await VAT3.loadAssets(scene, item.assetsRoot ?? VAT_ASSETS_ROOT, item.name);
		console.log(`loadVatItem: item [${item.name}] assets loaded:`, item.assets);
	}
	if (!item.instance) {
		item.instance = VAT3.create(scene, item.assets, item.type, item.novaConfig);
		console.log(`loadVatItem: item [${item.name}] instance created:`, item.instance);
	}

	await loadTextures(scene, item);

	return item;
};

const reportErrorOnce = (ui) => {
	let reported = false;

	return (error) => {
		if (reported) return;
		reported = true;
		reportVatError(ui, error);
	};
};

const reportVatError = (ui, error) => {
	console.error("VAT item failed to load:", error);
	const message = error instanceof Error ? error.message : String(error);
	ui.setTextFn(`Error: ${message}`);
};

const setItemEnabled = (item, enabled) => {
	applyTextures(item, enabled);
	item.instance.setEnabled(enabled);
};

const setupRenderLoop = (scene, onUpdate, onError) => {
	const accumulator = fixedTimeAccumulator(30);

	scene.onBeforeRenderObservable.add(() => {
		const deltaTime = scene.getEngine().getDeltaTime() / 1000;
		const t = accumulator(deltaTime);
		if (t === null || t === undefined) return;

		try {
			onUpdate(t);
		} catch (error) {
			onError(error);
		}
	});
};

export const createScene = () => {
	engine.enableOfflineSupport = false;

	const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(
        0.185,
        0.185,
        0.185,
        1.0
    );

	const camera = new BABYLON.ArcRotateCamera(
        "MainCamera",
        -1.570796,
        1.570796,
        6.5,
        BABYLON.Vector3.Zero(),
        scene
    );
	camera.attachControl(canvas, true);

	const light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
	light.intensity = 2.0;

	let controller;

	const ui = createNavigationUI(scene, async (forward) => {
		try {
			const item = await controller.navigate(forward);
			ui.setTextFn(item.name);
		} catch (error) {
			reportVatError(ui, error);
		}
	});

	loadVatModule(VAT_MODULE_PATH)
		.then(async () => {
			const items = [
				{
					name: "vat3_dynamicMesh",
					type: VatType.DynamicMesh
				},
				{
					name: "vat3_particles",
					textures: [
						{ name: "particlesAlbedo_tex", target: "albedoTexture", url: "circle_mask_128.png" }
					],
					type: VatType.Particles
				},
				{
					name: "vat3_rigidBody",
					type: VatType.Rigidbody
				},
				{
					name: "vat3_softBody",
					textures: [
						{ name: "softbodyAlbedo_tex", target: "albedoTexture", url: "flag_banner_red.jpg" }
					],
					type: VatType.Softbody
				}
			];

			controller = createVatController(scene, camera, items);
			setupRenderLoop(scene, controller.update, reportErrorOnce(ui));

			try {
				const first = await controller.activate(0);
				ui.setTextFn(first.name);
			} catch (error) {
				reportVatError(ui, error);
			}
		})
		.catch((error) => reportVatError(ui, error));

	return scene;
};

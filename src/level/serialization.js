DESERIALIZE_MAP = {};
for (const type of [
    Structure,
    Cat,
    Human,
    Spikes,
    Label,
    Water,
]) {
    DESERIALIZE_MAP[(new type()).type] = type;
}

const serializedProperties = ['type', 'x', 'y', 'angle', 'matrix', 'length', 'text', 'color', 'depth', 'seed',
    'facing', 'walking', 'walkingDirection', 'vY', 'lastLanded', 'nextShot', 'aim', 'lastSeenCat', 'lastCatCheck',
    'visionDistance', 'health'
];

serializeEntity = (entity) => {
    if (!entity.type) return null;

    const out = {};
    for (const key of serializedProperties) {
        if (key in entity) out[key] = entity[key];
    }
    return out;
}

deserializeEntity = (levelData) => {
    const entity = new (DESERIALIZE_MAP[levelData.type])();
    for (const key in levelData) {
        entity[key] = levelData[key];
    }
    return entity;
};

serializeWorld = (world) => {
    const out = [];
    for (const entity of world.entities) {
        const serializedEntity = serializeEntity(entity);
        if (serializedEntity) out.push(serializedEntity);
    }
    return out;
}

deserializeWorld = (levelData) => {
    const world = new World();
    for (const obj of levelData) {
        world.addEntity(deserializeEntity(obj));
    }
    return world;
}

getReplayWorldData = (replayState) => replayState?.world || replayState;

serializeReplayCamera = (world) => {
    const camera = firstItem(world.category('camera'));
    if (!camera) return null;

    const cameraState = {
        x: camera.x,
        y: camera.y,
        zoom: camera.zoom,
        age: camera.age,
        shakeEndAge: camera.shakeEndAge,
        shakePower: camera.shakePower,
    };

    const interpolators = [];
    for (const entity of world.entities) {
        if (entity instanceof Interpolator && entity.object === camera) {
            interpolators.push({
                property: entity.property,
                fromValue: entity.fromValue,
                toValue: entity.toValue,
                duration: entity.duration,
                age: entity.age,
                easing: entity.easing === easeInQuad ? 'easeInQuad' : 'linear',
            });
        }
    }
    if (interpolators.length) cameraState.interpolators = interpolators;

    return cameraState;
}

serializeReplayState = (world) => ({
    world: serializeWorld(world),
    camera: serializeReplayCamera(world),
    entityAges: world.entities
        .filter(entity => entity.type)
        .map(entity => entity.age),
});


var guiControls = new function () {
    this.num = 6;
};;
var raycaster = new THREE.Raycaster();
var mouseVector = new THREE.Vector3();
var selectedObject = null;
var colorArr = ["#f7cbd7", "#acff88", "#FFC125", "#FFC125", "#FF1493", "#C0FF3E", "#9F79EE", "#ffa0a0", "#aaa0ff", "#ff1919"];
var planesMesh = [];
var FIXEDFAR = 1.5;
var timeLength = 1.5;
var group = new THREE.Group();
function planesFromMesh(vertices, indices) {
    // creates a clipping volume from a convex triangular mesh
    // specified by the arrays 'vertices' and 'indices'
    var n = indices.length / 3,
        result = new Array(n);
    for (var i = 0, j = 0; i < n; ++i, j += 3) {
        var a = vertices[indices[j]],
            b = vertices[indices[j + 1]],
            c = vertices[indices[j + 2]];
        result[i] = new THREE.Plane().
            setFromCoplanarPoints(a, b, c);
    }
    return result;
}
function createPlanes(n) {
    // creates an array of n uninitialized plane objects
    var result = new Array(n);
    for (var i = 0; i !== n; ++i)
        result[i] = new THREE.Plane();
    return result;
}
function assignTransformedPlanes(planesOut, planesIn, matrix) {
    // sets an array of existing planes to transformed 'planesIn'
    for (var i = 0, n = planesIn.length; i !== n; ++i)
        planesOut[i].copy(planesIn[i]).applyMatrix4(matrix);
}
function cylindricalPlanes(n, innerRadius) {
    var result = createPlanes(n);
    for (var i = 0; i !== n; ++i) {
        var plane = result[i],
            angle = i * Math.PI * 2 / n;
        plane.normal.set(
            Math.cos(angle), 0, Math.sin(angle));
        plane.constant = innerRadius;
    }
    return result;
}
var planeToMatrix = (function () {
    // creates a matrix that aligns X/Y to a given plane
    // temporaries:
    var xAxis = new THREE.Vector3(),
        yAxis = new THREE.Vector3(),
        trans = new THREE.Vector3();
    return function planeToMatrix(plane) {
        var zAxis = plane.normal,
            matrix = new THREE.Matrix4();
        // Hughes & Moeller '99
        // "Building an Orthonormal Basis from a Unit Vector."
        if (Math.abs(zAxis.x) > Math.abs(zAxis.z)) {
            yAxis.set(- zAxis.y, zAxis.x, 0);
        } else {
            yAxis.set(0, - zAxis.z, zAxis.y);
        }
        xAxis.crossVectors(yAxis.normalize(), zAxis);
        plane.coplanarPoint(trans);
        return matrix.set(
            xAxis.x, yAxis.x, zAxis.x, trans.x,
            xAxis.y, yAxis.y, zAxis.y, trans.y,
            xAxis.z, yAxis.z, zAxis.z, trans.z,
            0, 0, 0, 1);
    };
})();
// A regular tetrahedron for the clipping volume:
var Vertices = [
    new THREE.Vector3(+ 1, 0, + Math.SQRT1_2),
    new THREE.Vector3(- 1, 0, + Math.SQRT1_2),
    new THREE.Vector3(0, + 1, - Math.SQRT1_2),
    new THREE.Vector3(0, - 1, - Math.SQRT1_2)
],
    Indices = [
        0, 1, 2, 0, 2, 3, 0, 3, 1, 1, 3, 2
    ],
    Planes = planesFromMesh(Vertices, Indices),
    PlaneMatrices = Planes.map(planeToMatrix),
    GlobalClippingPlanes = cylindricalPlanes(5, 3.5),
    Empty = Object.freeze([]);

var camera, scene, renderer, startTime, stats,
    object, clipMaterial,
    volumeVisualization,
    globalClippingPlanes;

function init() {
    camera = new THREE.PerspectiveCamera(36, window.innerWidth / window.innerHeight, 0.25, 16);
    // camera.position.set(0, 6, 12);
    camera.position.set(0, 1.5, 3);
    scene = new THREE.Scene();
    scene.background = new THREE.Color().setHSL(0.780, 0.2941, 0.5667);
    // Lights
    scene.add(new THREE.AmbientLight(0x5fbfff));
    var spotLight = new THREE.SpotLight(0xffffff);
    spotLight.angle = Math.PI / 5;
    spotLight.penumbra = 0.2;
    spotLight.position.set(2, 3, 3);
    spotLight.castShadow = true;
    spotLight.shadow.camera.near = 3;
    spotLight.shadow.camera.far = 10;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    scene.add(spotLight);

    var dirLight = new THREE.DirectionalLight(0x55505a, 1);
    dirLight.position.set(0, 2, 0);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 10;
    dirLight.shadow.camera.right = 1;
    dirLight.shadow.camera.left = - 1;
    dirLight.shadow.camera.top = 1;
    dirLight.shadow.camera.bottom = - 1;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Geometry
    clipMaterial = new THREE.MeshPhongMaterial({
        color: 0x0a87ee,
        shininess: 100,
        side: THREE.DoubleSide,
        // Clipping setup:
        clippingPlanes: createPlanes(Planes.length),
        clipShadows: true
    });


    object = new THREE.Group();
    var geometry = new THREE.BoxBufferGeometry(0.18, 0.18, 0.18);
    for (var z = - Math.round(guiControls.num); z <= Math.round(guiControls.num); ++z)
        for (var y = - Math.round(guiControls.num); y <= Math.round(guiControls.num); ++y)
            for (var x = - Math.round(guiControls.num); x <= Math.round(guiControls.num); ++x) {
                planesMesh[i] = new THREE.Mesh(geometry, clipMaterial);
                planesMesh[i].position.set(x / 5, y / 5, z / 5);
                planesMesh[i].castShadow = true;
                group.add(planesMesh[i]);
            }
    scene.add(group);

    var planeGeometry =
        new THREE.PlaneBufferGeometry(3, 3, 1, 1),
        color = new THREE.Color();
    volumeVisualization = new THREE.Group();
    volumeVisualization.visible = false;
    for (var i = 0, n = Planes.length; i !== n; ++i) {
        var material = new THREE.MeshBasicMaterial({
            color: color.setHSL(i / n, 0.5, 0.5).getHex(),
            side: THREE.DoubleSide,
            opacity: 0.2,
            transparent: true,
            // clip to the others to show the volume (wildly
            // intersecting transparent planes look bad)
            clippingPlanes: clipMaterial.clippingPlanes.
                filter(function (_, j) {
                    return j !== i;
                })
            // no need to enable shadow clipping - the plane
            // visualization does not cast shadows
        });
        volumeVisualization.add(
            new THREE.Mesh(planeGeometry, material));
    }
    // scene.add( volumeVisualization );

    var ground = new THREE.Mesh(planeGeometry,
        new THREE.MeshPhongMaterial({
            color: 0x6eeafd, shininess: 150
        }));
    ground.rotation.x = - Math.PI / 2;
    ground.scale.multiplyScalar(3);
    ground.receiveShadow = true;
    scene.add(ground);

    // Renderer
    var container = document.body;
    renderer = new THREE.WebGLRenderer();
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('mousedown', onDocumentMouseDown, false);
    container.appendChild(renderer.domElement);
    // Clipping setup:
    globalClippingPlanes = createPlanes(GlobalClippingPlanes.length);
    renderer.clippingPlanes = Empty;
    // renderer.localClippingEnabled = false;
    // Stats
    stats = new Stats();
    container.appendChild(stats.dom);
    // Controls

    //controller
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    // 惯性
    controls.enableDamping = true;
    //鼠标灵敏度
    controls.dampingFactor = 1;
    //缩放
    controls.enableZoom = true;
    //是旋转
    controls.autoRotate = false;
    //拖拽
    controls.enablePan = false;

    // gui
    var gui = new dat.GUI(),
        folder = gui.addFolder("Local Clipping"),
        props = {
            get 'shape'() {
                return renderer.localClippingEnabled;
            },
            set 'shape'(v) {
                renderer.localClippingEnabled = v;
                if (!v) volumeVisualization.visible = false;
            }
        };
    folder.add(props, 'shape');
    gui.add(guiControls, "num", 2, 36);
    // Start
    startTime = Date.now();
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
function setObjectWorldMatrix(group, matrix) {
    // set the orientation of an object based on a world matrix
    var parent = group.parent;
    scene.updateMatrixWorld();
    group.matrix.getInverse(parent.matrixWorld);
    group.applyMatrix(matrix);
}

function onDocumentMouseDown(event) {
    event.preventDefault();
    if (selectedObject) {
        selectedObject = null;
    }

    var intersects = getIntersects(event.layerX, event.layerY);
    if (intersects.length > 0) {
        var res = intersects.filter(function (res) {
            return res && res.object;
        })[length];

        if (res && res.object) {
            selectedObject = res.object;
            console.log(selectedObject);
            // 设置随机颜色
            selectedObject.material.color.set(colorArr[Math.round(Math.random() * (10 - (-0) + 1) + (-0))]);
        }
    }
}
function getIntersects(x, y) {
    x = (x / window.innerWidth) * 2 - 1;
    y = - (y / window.innerHeight) * 2 + 1;
    mouseVector.set(x, y, 0.5);
    raycaster.setFromCamera(mouseVector, camera);
    // console.log(raycaster.intersectObjects(group.children, true));
    return raycaster.intersectObjects(group.children, true);
}

var transform = new THREE.Matrix4(),
    tmpMatrix = new THREE.Matrix4();
function animate() {
    var currentTime = Date.now(),
        time = (currentTime - startTime) / 1000;
    requestAnimationFrame(animate);
    group.position.y = 1;
    group.rotation.x = time * 0.5;
    group.rotation.y = time * 0.2;
    group.updateMatrix();
    transform.copy(group.matrix);
    if(timeLength > 6 && timeLength < 7.5){
        FIXEDFAR -= 0.01;
    }
    else if(timeLength > 7.5 && timeLength < 9 || timeLength <6){
        FIXEDFAR += 0.01;
    }
    else if(timeLength > 9){
        FIXEDFAR = 6;
        timeLength = 10;
    }

    camera.position.set(0, FIXEDFAR, FIXEDFAR*2);
    timeLength += 0.01;

    var bouncy = Math.cos(time * .5) * 0.5 + 0.7;
    transform.multiply(
        tmpMatrix.makeScale(bouncy, bouncy, bouncy));
    assignTransformedPlanes(
        clipMaterial.clippingPlanes, Planes, transform);
    var planeMeshes = volumeVisualization.children;
    for (var i = 0, n = planeMeshes.length; i !== n; ++i) {
        tmpMatrix.multiplyMatrices(transform, PlaneMatrices[i]);
        setObjectWorldMatrix(planeMeshes[i], tmpMatrix);
    }
    transform.makeRotationY(time * 0.1);
    assignTransformedPlanes(
        globalClippingPlanes, GlobalClippingPlanes, transform);
    stats.begin();
    renderer.render(scene, camera);
    stats.end();
}
init();
animate();
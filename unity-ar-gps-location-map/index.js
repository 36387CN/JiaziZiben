let mapZoom = 16;
let mapCenter = [-74.50, 40];
let map;
let currentPointLatLng = [0, 0];

let appData = [];

let selectedPointId = -1;
let selectedPointdata;
let pointsList;
let nameInputEl;
let lngValueEl;
let latValueEl;
let addMarkerButton;
let removeMarkerButton;
let downloadJsonButton;
let downloadXmlButton;
let uploadJsonButton;
let uploadXmlButton;
let dataIdCounter = 0;
let tempMarker;
let selectedMarkera;
let idLabelEl;
let altitudeEl;
let altitudeModeEl;
let removeAllMarkersButton;
let movementSmoothingInputEl;
let maxNumberOfLocationUpdatesEl;
let useMovingAverageInputEl;
let hideObjectUtilItIsPlacedEl;
let meshIdInputEl;
let markers = [];

// TODO: Make UI more compact / reduce font sizes on panel
// TODO: Use local storage?
// TODO: Add 'X'/Remove button to each point in the list,
// TODO: Separate into datasets.
// TODO: Add users/backend.
// TODO: MeshID Autocomplete.
// TODO: Add location search bar.

function pipeInputToSelectedPointData(el, propName, targetPropName = 'value') {
    el.addEventListener('input', e => {
	if (!selectedPointdata) {
	    return;
	}

	if (selectedPointdata[propName] == undefined) {
	    throw new Error("[pipeInputToSelectedPointData] Invalid propName: " + propName);
	}

	selectedPointdata[propName] = e.target[targetPropName];
	renderPointsList();
    })
}

function getElementById(id) {
    const el = document.getElementById(id);

    if (!el) {
	throw new Error("Element not found: " + id);
    }

    return el;
}

function downloadTextFile(stringContent, fileName, dataType = "text/plain"){
    var dataStr = `data:${dataType};charset=utf-8,` + encodeURIComponent(stringContent);
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", fileName);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}


function initElements() {
    addMarkerButton = getElementById("add-marker-button");
    latValueEl = getElementById("lat-value");
    lngValueEl = getElementById("lng-value");
    idLabelEl = getElementById("id-value");
    pointsList = getElementById("points-list");
    nameInputEl = getElementById("name-input");
    altitudeEl = getElementById("altitude-input");
    altitudeModeEl = getElementById("altitude-mode-input");
    movementSmoothingInputEl = getElementById("movement-smoothing-input");
    maxNumberOfLocationUpdatesEl = getElementById("max-number-location-updates-input");
    useMovingAverageInputEl = getElementById("use-moving-average-input");
    hideObjectUtilItIsPlacedEl = getElementById("hide-object-until-placed-input");
    meshIdInputEl = getElementById("mesh-id-input");

    removeMarkerButton = getElementById("remove-marker-button");
    removeAllMarkersButton = getElementById("clear-all-button");
    downloadJsonButton = getElementById("download-json-button");
    uploadJsonButton = getElementById("upload-json-button");
    downloadXmlButton = getElementById("download-xml-button");
    uploadXmlButton = getElementById("upload-xml-button");
    removeMarkerButton.disabled = true;
}

function createMap() {
    if (!window['mapboxgl'])
    {
	console.error('Leaflef was not loaded! Aborting.');
	return;
    }

    mapboxgl.accessToken = 'pk.eyJ1IjoiZG1iZm0iLCJhIjoiY2tnc2ZyNjFuMWZwczJybXR5ZjhiaGF2cCJ9.wc3s8JqfVTunyCYSg5oJOA';
    map = new mapboxgl.Map({
	container: 'map-containter', // container id
	style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
	center: mapCenter, // starting position [lng, lat]
	zoom: mapZoom // starting zoom
    });    

    // TODO: Maybe get user location elsewhere, and center the map via code,
    //       and/or save last user location.
    map.addControl(new mapboxgl.GeolocateControl({
	positionOptions: {
	    enableHighAccuracy: true
	},
	trackUserLocation: false
    }));

    map.addControl(new MapboxGeocoder({
	accessToken: mapboxgl.accessToken,
	mapboxgl: mapboxgl
    }));
    
    map.on('click', e => {
	currentPointLatLng = [e.lngLat.lat, e.lngLat.lng];
	latValueEl.innerText = currentPointLatLng[0];
	lngValueEl.innerText = currentPointLatLng[1];

	selectedPointdata && selectPoint(-1);
	
	addTempMarkerAt(currentPointLatLng);
    });
}


function initMarkers() {
    selectedMarker = new mapboxgl.Marker({ color: 'green ', draggable: true })
	.setLngLat([0, 0])
	.addTo(map);
    selectedMarker.getElement().style.zIndex = 1000;
    selectedMarker.getElement().addEventListener('click', e => {
	e.preventDefault();
	e.stopPropagation();
    });

    selectedMarker.on('dragstart', () => {
	let data = selectedPointdata;
	let marker = getMarkerById(data.id);
	hideMarker(marker.marker);
    })

    selectedMarker.on('dragend', () => {
	let data = selectedPointdata;
	let marker = getMarkerById(data.id);
	var lngLat = selectedMarker.getLngLat();
	data.location = [lngLat.lat, lngLat.lng];

	marker.marker.setLngLat({ lat: data.location[0], lng: data.location[1] });

	latValueEl.innerText = data.location[0];
	lngValueEl.innerText = data.location[1];

	unhideMarker(marker.marker);

	renderPointsList();
    });

    hideMarker(selectedMarker);
}


function addEventListeners() {
    
    addMarkerButton.addEventListener('click', () => {

	if (nameInputEl.value === "") {
	    nameInputEl.classList.add("is-error");
	    return;
	} else {
	    nameInputEl.classList.remove("is-error");
	}

	if (meshIdInputEl.value === "") {
	    meshIdInputEl.classList.add("is-error");
	    return;
	} else {
	    meshIdInputEl.classList.remove("is-error");
	}   
	

	
	let marker = new mapboxgl.Marker({ draggable: true })
	    .setLngLat({ lat: currentPointLatLng[0], lng: currentPointLatLng[1] })
	    .addTo(map);


	let id = dataIdCounter;
	marker.getElement().addEventListener('click', e => {
	    e.preventDefault();
	    e.stopPropagation();

	    selectPoint(id);
	});

	markers.push({
	    marker,
	    id
	});


	appData.push({
	    id,
	    location: [currentPointLatLng[0], currentPointLatLng[1]],
	    altitude: altitudeEl.value,
	    altitudeMode: altitudeModeEl.value,
	    name: nameInputEl.value,
	    meshId: meshIdInputEl.value,
	    movementSmoothing: movementSmoothingInputEl.value,
	    maxNumberOfLocationUpdates: maxNumberOfLocationUpdatesEl.value,
	    useMovingAverage: useMovingAverageInputEl.checked,
	    hideObjectUtilItIsPlaced: hideObjectUtilItIsPlacedEl.checked
	});
	dataIdCounter++;


	renderPointsList();

	selectPoint(id);
	removeTempMarker();

	marker.on('dragend', () => {
	    let data = getDataEntryById(id);
	    var lngLat = marker.getLngLat();
	    data.location = [lngLat.lat, lngLat.lng];

	    renderPointsList();
	});

	console.log(appData);
    });

    removeMarkerButton.addEventListener('click', () => {
	if (selectedPointId < 0) {
	    return;
	}

	let index = getIndexOfDataEntryById(selectedPointId);
	appData.splice(index, 1);

	let marker = markers[index];
	marker.marker.remove();
	markers.splice(index, 1);

	renderPointsList();
	selectPoint(-1);
    })

    downloadJsonButton.addEventListener('click', () => {
	let string = JSON.stringify(appData);

	downloadTextFile(string, "data.json", "text/json");	
    });

    uploadJsonButton.addEventListener("click", () => {
	console.log("OK");
	const fileInput = document.getElementById("json-file-input");

	fileInput.click();
    });

    document.getElementById("json-file-input").addEventListener("change", e => {
	console.log(e);
	const reader = new FileReader();
	reader.onload = e => {
	    console.log(e.target.result);

	    const jsonData = JSON.parse(e.target.result);

	    loadAppData(jsonData);
	};
	
	reader.readAsText(e.target.files[0]);
	e.target.value = null;
    });

    uploadXmlButton.addEventListener("click", () => {
	console.log("OK");
	const fileInput = document.getElementById("xml-file-input");

	fileInput.click();
    });

    document.getElementById("xml-file-input").addEventListener("change", e => {
	console.log(e);
	const reader = new FileReader();
	reader.onload = e => {
	    const parser = new DOMParser();
	    xmlDoc = parser.parseFromString(e.target.result, "text/xml");
	    console.log(xmlDoc);
	    window['xmlDoc'] = xmlDoc;

	    const entries = xmlDoc.children[0];
	    const data = [];
	    
	    for (let i = 0; i < entries.childElementCount; i++) {
		const entryNode = entries.children[i];
		const dataEntry = {};
		for (let j = 0; j < entryNode.childElementCount; j++) {
		    const propNode = entryNode.children[j];

		    let val;

		    if (["id", "maxNumberOfLocationUpdates"].indexOf(propNode.tagName) >= 0) {
			val = parseInt(propNode.innerHTML);
		    } else if (["lat", "lng", "altitude", "movementSmoothing"].indexOf(propNode.tagName) >= 0) {
			val = parseFloat(propNode.innerHTML);
			
		    } else if(["hideObjectUtilItIsPlaced", "useMovingAverage"].indexOf(propNode.tagName) >= 0) {
			val = propNode.innerHTML === "true" ? true : false;
		    } else {
			val = propNode.innerHTML;
		    }
		    
		    dataEntry[propNode.tagName] = val;

		    console.log(dataEntry);
		}
		dataEntry.location = [dataEntry.lat, dataEntry.lng];
		delete dataEntry.lat;
		delete dataEntry.lng;
		data.push(dataEntry);
	    }

	    console.log(data);
	    loadAppData(data);
	};
	
	reader.readAsText(e.target.files[0]);
	e.target.value = null;
    });

    
    downloadXmlButton.addEventListener('click', () => {
	
	let xml = "<ArGpsLocationData>";

	for (let i = 0; i < appData.length; i++) {
	    xml += "<Entry>"

	    let data = appData[i];
	    Object.keys(data).forEach(key => {

		if (key == "location") {
		    let value = data[key];
		    xml += `<lat>${value[0]}</lat>`;
		    xml += `<lng>${value[1]}</lng>`;
		} else {			
		    let value = data[key];
		    xml += `<${key}>`;
		    xml += "" + value;
		    xml += `</${key}>`;
		}
	    });
	    
	    xml += "</Entry>"
	}
	

	xml += "</ArGpsLocationData>";

	downloadTextFile(xml, "data.xml", "text/xml");
    });

    removeAllMarkersButton.addEventListener('click', () => {
	appData = [];

	clearAllMarkers();
    });

    pipeInputToSelectedPointData(nameInputEl, 'name');
    pipeInputToSelectedPointData(meshIdInputEl, 'meshId');
    pipeInputToSelectedPointData(altitudeEl, 'altitude');
    pipeInputToSelectedPointData(movementSmoothingInputEl, 'movementSmoothing');
    pipeInputToSelectedPointData(altitudeModeEl, 'altitudeMode');
    pipeInputToSelectedPointData(maxNumberOfLocationUpdatesEl, 'maxNumberOfLocationUpdates');
    pipeInputToSelectedPointData(useMovingAverageInputEl, "useMovingAverage", "checked");
    pipeInputToSelectedPointData(hideObjectUtilItIsPlacedEl, "hideObjectUtilItIsPlaced", "checked");
}

function loadAppData(newData) {
    if (newData === appData) return;
    
    appData.splice(0, appData.length);
    appData.push(...newData);

    clearAllMarkers();
    
    let maxId = 0;
    for (let i = 0; i < appData.length; i++) {

	let data = appData[i];

	let marker = new mapboxgl.Marker({ draggable: true })
	    .setLngLat({ lat: data.location[0], lng: data.location[1] })
	    .addTo(map);


	let id = data.id;
	marker.getElement().addEventListener('click', e => {
	    e.preventDefault();
	    e.stopPropagation();

	    selectPoint(id);
	});
	
	marker.on('dragend', () => {
	    let data = getDataEntryById(id);
	    var lngLat = marker.getLngLat();
	    data.location = [lngLat.lat, lngLat.lng];
	    
	    renderPointsList();
	});


	markers.push({
	    marker,
	    id
	});

	if (id > maxId) maxId = id;
    }

    dataIdCounter = maxId + 1;
    
    renderPointsList();
    selectPoint(-1);
    hideMarker(tempMarker);    
}

function clearAllMarkers() {
    for (let i = 0; i < markers.length; i++) {
	markers[i].marker.remove();
    }

    markers.splice(0, markers.length);

    selectPoint(-1);
}

function main() {
    console.log("Starting Unity AR+GPS Location Map Editor.");

    initElements();
    createMap();
    initMarkers();
    addEventListeners();


    selectPoint(-1);
}

function renderPointsList() {
    pointsList.innerHTML = "";

    for (let i = 0; i < appData.length; i++) {
	const data = appData[i];
	const li = document.createElement('li');

	li.className = "menu-item pointer";

	let selected = selectedPointId === data.id;
	
	li._app_index = data.id;
	li.addEventListener('click', e => selectPoint(e.target._app_index));
	li.innerHTML =
	    `
              <a href="#" ${selected ? `class="active inactiveLink"` : `class="inactiveLink"` }><span>
                 ${data.id}. ${data.name} (${data.location[0].toFixed(6)}, ${data.location[1].toFixed(6)})
              </span></a>
            `;

	pointsList.appendChild(li);
    }
}

const dataDefault = {
    name: "",
    meshId: "",
    altitude: 0,
    movementSmoothing: 0.05,
    altitudeMode: "GroundRelative",
    location: [0, 0],
    id: "",
    maxNumberOfLocationUpdates: 0,
    useMovingAverage: false,
    hideObjectUtilItIsPlaced: true
};



function selectPoint(id) {
    if (id < 0) {
	selectedPointId = -1;
	selectedPointdata = null;
	
	altitudeModeEl.value = dataDefault.altitudeMode;
	nameInputEl.value = dataDefault.name;
	altitudeEl.value = dataDefault.altitude;
	movementSmoothingInputEl.value = dataDefault.movementSmoothing;
	idLabelEl.value = dataDefault.id;
	maxNumberOfLocationUpdatesEl.value = dataDefault.maxNumberOfLocationUpdates;
	useMovingAverageInputEl.checked = dataDefault.useMovingAverage;
	hideObjectUtilItIsPlacedEl.checked = dataDefault.hideObjectUtilItIsPlaced;
	meshIdInputEl.value = dataDefault.meshId;

	addMarkerButton.disabled = false;
	removeMarkerButton.disabled = true;

	hideMarker(selectedMarker);
	renderPointsList();
    } else {
	let data = getDataEntryById(id);

	nameInputEl.value = data.name;
	altitudeEl.value = data.altitude;
	altitudeModeEl.value = data.altitudeMode;
	idLabelEl.innerText = data.id;
	latValueEl.innerText = data.location[0];
	lngValueEl.innerText = data.location[1];
	movementSmoothingInputEl.value = data.movementSmoothing;
	maxNumberOfLocationUpdatesEl.value = data.maxNumberOfLocationUpdates;
	useMovingAverageInputEl.checked = data.useMovingAverage;
	hideObjectUtilItIsPlacedEl.checked = data.hideObjectUtilItIsPlaced;
	meshIdInputEl.value = data.meshId;

	addMarkerButton.disabled = true;
	removeMarkerButton.disabled = false;
	selectedPointId = id;
	selectedPointdata = data;

	selectedMarker.setLngLat({ lat: data.location[0], lng: data.location[1] });
	unhideMarker(selectedMarker);
	renderPointsList();

	removeTempMarker();
	console.log(map, map.getBounds().getSouthWest());

	if (!contains(map.getBounds(), data.location[0], data.location[1])) {
	    map.setCenter({ lat: data.location[0], lng: data.location[1] });
	}

	window['selectedMarker'] = selectedMarker;
    }
}

function contains(bounds, lat, lng) {
    let southWest = bounds.getSouthWest();
    let northEast = bounds.getNorthEast();

    console.log(lat, southWest.lat);

    return (lat >= southWest.lat) && (lng >= southWest.lng) && (lat <= northEast.lat) && (lng <= northEast.lng);
}
    

function addTempMarkerAt(loc) {
    removeTempMarker();

    console.log(loc);

    tempMarker = new  mapboxgl.Marker({ color: 'red', draggable: true })
	.setLngLat({ lat: loc[0], lng: loc[1] })
	.addTo(map);

    tempMarker.on('dragend', () => {
	let lngLat = tempMarker.getLngLat();
	let location = [lngLat.lat, lngLat.lng];

	latValueEl.innerText = location[0];
	lngValueEl.innerText = location[1];

	currentPointLatLng = [location[0], location[1]];
    });


}

function removeTempMarker() {
    if (tempMarker) {
	tempMarker.remove();
	tempMarker = null;
    }
}

function getDataEntryById(id) {
    return getArrayEntryById(appData, id);
}

function getMarkerById(id) {
    return getArrayEntryById(markers, id);
}

function hideMarker(marker) {
    if (!marker) return;

    const el = marker.getElement();

    if (!el) return;
    
    el.style.visibility = "hidden";
}

function unhideMarker(marker) {
    if (!marker) return;

    const el = marker.getElement();

    if (!el) return;
    
    el.style.visibility = "visible";
}

function getArrayEntryById(arr, id) {
    let data;
    for (let i = 0; i < arr.length; i++) {
	let item = arr[i];

	if (item.id == id) {
	    data = item;
	    break;
	}
    }

    if (!data) {
	console.error("[selectPoint]: Invalid id = " + id);
	return;
    }

    return data;
}

function getIndexOfDataEntryById(id) {
    let index = -1;
    for (let i = 0; i < appData.length; i++) {
	let item = appData[i];

	if (item.id == id) {
	    index = i;
	    break;
	}
    }

    if (index < 0) {
	console.error("[selectPoint]: Invalid id = " + id);
	return;
    }

    return index;
}

main();

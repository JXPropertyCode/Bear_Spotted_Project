import { useState, useCallback, useRef } from "react";
import "./App.css";
import {
	GoogleMap,
	useLoadScript,
	Marker,
	InfoWindow,
} from "@react-google-maps/api";

// formatted the time the user inputted the bears
import { formatRelative } from "date-fns";

import usePlacesAutocomplete, {
	getGeocode,
	getLatLng,
} from "use-places-autocomplete";

import {
	Combobox,
	ComboboxInput,
	ComboboxPopover,
	ComboboxList,
	ComboboxOption,
} from "@reach/combobox";

import "@reach/combobox/styles.css";
import mapStyles from "./mapStyles";

// These const variables are to pass into the Google Maps components to prevent re-rendering
// if they are variables it prevents re-render, since if not, React will think it changed so it re-renders
const libraries = ["places"];
const mapContainerStyle = {
	width: "100vw",
	height: "100vh",
};

// center defaulted at SF
const center = {
	lat: 37.7749,
	lng: -122.4194,
};

// override google maps styles
const options = {
	styles: mapStyles,
	disableDefaultUI: true, // removes all the default controls like satelite and person
	zoomControl: true, // recall back the zoom control
};

function App() {
	const { isLoaded, loadError } = useLoadScript({
		googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
		libraries, // this is to avoid too many rerenders
	});

	// This is to keep track of the markers and which are selected
	const [markers, setMarkers] = useState([]);
	// Wanna see info of the markers
	const [selected, setSelected] = useState(null);

	// how to avoid recreating functions on every render
	// useCallback allows you to create a function that will retain the same value unless the dependcies are detected to change
	const onMapClick = useCallback((e) => {
		// console.log(e);
		// this is basically going to hold all of our data onto the markers array
		setMarkers((current) => [
			...current,
			{
				lat: e.latLng.lat(),
				lng: e.latLng.lng(),
				time: new Date(),
			},
		]);
	}, []);

	// retain the ref to its map instance
	const mapRef = useRef();

	// callback when the map loads, so you can assign to the ref to be used later to prevent rerenders
	const onMapLoad = useCallback((map) => {
		mapRef.current = map;
	}, []);

	// useCallback means it only creates o ne of these functions
	const panTo = useCallback(({ lat, lng }) => {
		// pan to the selected location
		mapRef.current.panTo({ lat, lng });
		// zoom in a little after panning
		mapRef.current.setZoom(14);
	}, []);

	if (loadError) return <h1>Error Loading Maps</h1>;

	if (!isLoaded) return <h1>Loading Maps</h1>;
	if (markers) {
		console.log(markers);
	}

	return (
		<div>
			<h1>Bears</h1>

			{/* pan to the location of the search function */}
			<Search panTo={panTo} />
			<Locate panTo={panTo} />

			<GoogleMap
				mapContainerStyle={mapContainerStyle}
				zoom={8}
				center={center}
				options={options}
				onClick={onMapClick}
				onLoad={onMapLoad}
			>
				{/* this creates a marker for where the user clicks */}
				{markers.map((marker) => (
					// marks the place where the user presses
					<Marker
						key={marker.time.toISOString()}
						position={{ lat: marker.lat, lng: marker.lng }}
						icon={{
							url: "/bear.svg",
							scaledSize: new window.google.maps.Size(30, 30),

							// when clicked, the bear would show at the point of where I clicked instead of above
							origin: new window.google.maps.Point(0, 0),
							anchor: new window.google.maps.Point(15, 15),
						}}
						onClick={() => {
							setSelected(marker);
						}}
					/>
				))}

				{selected ? (
					<InfoWindow
						position={{ lat: selected.lat, lng: selected.lng }}
						onCloseClick={() => {
							// after the user closes the info, it will reset
							setSelected(null);
						}}
					>
						<div>
							<h2>Bear Spotted!</h2>
							<p>
								Spotted{" "}
								{formatRelative(selected.time, new Date())}
							</p>
						</div>
					</InfoWindow>
				) : null}
			</GoogleMap>
		</div>
	);
}

function Locate({ panTo }) {
	return (
		<button
			className="locate"
			onClick={() => {
				// using the browsers built in geolocation
				navigator.geolocation.getCurrentPosition(
					(position) => {
						// goes to your current location
						panTo({
							lat: position.coords.latitude,
							lng: position.coords.longitude,
						});
						console.log(position);
					},
					() => null
				);
			}}
		>
			<img src="./compass.svg" alt="Compass" />
		</button>
	);
}

function Search({ panTo }) {
	const {
		ready,
		value,
		suggestions: { status, data },
		setValue,
		clearSuggestions,
	} = usePlacesAutocomplete({
		requestOptions: {
			location: { lat: () => 43.653225, lng: () => -79.383186 },
			radius: 200 * 1000,
		},
	});

	// console.log("data:", data);
	return (
		<div className="search">
			<Combobox
				onSelect={async (address) => {
					setValue(address, false);
					clearSuggestions();

					try {
						// get GeoCode info
						const results = await getGeocode({ address });
						// gets the lat and lng of the location that we searched and selected
						const { lat, lng } = await getLatLng(results[0]);
						console.log(lat, lng);
						panTo({ lat, lng });
					} catch (error) {
						console.log("Error!");
					}
				}}
			>
				<ComboboxInput
					value={value}
					onChange={(e) => {
						setValue(e.target.value);
					}}
					disabled={!ready}
					placeholder="Enter an Address"
				/>
				<ComboboxPopover>
					{/* recives all the suggestion that Google places gives us */}
					<ComboboxList>
						{status === "OK" &&
							data.map(({ place_id, description }) => (
								<ComboboxOption
									key={place_id}
									value={description}
								/>
							))}
					</ComboboxList>
				</ComboboxPopover>
			</Combobox>
		</div>
	);
}

export default App;

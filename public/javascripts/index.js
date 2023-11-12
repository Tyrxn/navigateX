
let isValidStart = false;
let isValidEnd = false;

let config = {};

async function fetchConfig() {
  try {
    const response = await fetch('/config');
    if (response.ok) {
      config = await response.json();
      loadGoogleMapsAPI(config.googleAPIKey);
      validateAPIKeys();  // Add this line
    } else {
      console.error('Failed to fetch config');
    }
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

async function validateAPIKeys() {
  try {
    const start = performance.now(); 
    const openWeatherResponse = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=London&appid=${config.openWeatherAPIKey}`);
    const end = performance.now(); 

    const duration = end - start; 

    console.log(`OpenWeather API call took ${duration}ms`);

    const openWeatherData = await openWeatherResponse.json();

    if (openWeatherData.cod !== 200) {
      alert('Invalid OpenWeather API key');
      console.log("Issue with OpenWeather API key.");
    }

  } catch (error) {
    console.error('Error during API key validation:', error);
  }
}





function loadGoogleMapsAPI(googleAPIKey) {
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleAPIKey}&libraries=places&callback=initMap&v=weekly`;
  script.defer = true;
  script.async = true;
  document.head.appendChild(script);
}


fetchConfig();




async function initMap() {
  const mapOptions = {
    zoom: 7,
    center: { lat: -27.47, lng: 153.02 },
    disableDefaultUI: true,
  };

  document.getElementById("startButton").addEventListener("click", function() {
    if (!isValidStart) {
      alert("Please enter a valid starting location.");
      return; 
    }
    document.querySelector(".start").style.display = "none"; 
    document.getElementById("startButton").style.display = "none";  
    document.querySelector(".end").style.display = "block"; 
    document.querySelector("#endButton").style.display = "block"; 
  });

  document.getElementById("endButton").addEventListener("click", function() {
    if (!isValidEnd) {
      alert("Please enter a valid ending location.");
      return; 
    }
    document.querySelector(".end").style.display = "none";
    document.getElementById("endButton").style.display = "none";  
    document.querySelector(".departTime").style.display = "block";
    document.querySelector("#submit").style.display = "block";
  });




  document.getElementById("submit").addEventListener("click", async () => {
    const departureTime = new Date(document.getElementById("departureTime").value);
    const currentTime = new Date(); 
    currentTime.setSeconds(0, 0); 

    const departureTimeValue = document.getElementById("departureTime").value;

    if (!departureTimeValue) {
      alert("Please set the departure time.");
      return;
    }

    if (departureTime < currentTime) {
      alert("Please enter a future date/time for departure.");
      return;
    }

    document.getElementById("startContainer").style.display = "none";
    document.getElementById("mainContainer").style.height = "auto";
    showRouteUI();
    await calculateAndDisplayRoute(directionsService, directionsRenderer);
  });



  const map = new google.maps.Map(document.getElementById("map"), mapOptions);
  const directionsRenderer = new google.maps.DirectionsRenderer();
  const directionsService = new google.maps.DirectionsService();

  directionsRenderer.setMap(map);
  directionsRenderer.setPanel(document.getElementById("sidebar"));

  setupAutocomplete("start", map, directionsService, directionsRenderer);
  setupAutocomplete("end", map, directionsService, directionsRenderer);


}



function setupAutocomplete(id, map, directionsService, directionsRenderer) {
  const input = document.getElementById(id);
  const autocomplete = new google.maps.places.Autocomplete(input, { types: ['geocode'] });
  autocomplete.setFields(['address_components']);
  autocomplete.addListener('place_changed', function() {
    const place = this.getPlace();

    if (place.address_components) {
      if (id === "start") {
        isValidStart = true;
      } else if (id === "end") {
        isValidEnd = true;
      }
      fillInAddress(place);
    } else {
      if (id === "start") {
        isValidStart = false;
      } else if (id === "end") {
        isValidEnd = false;
      }
    }
  });
}

function fillInAddress(place) {

  for (const component of place.address_components) {
    const componentType = component.types[0];

  }
}

async function calculateAndDisplayRoute(directionsService, directionsRenderer) {
  const start = document.getElementById("start").value;
  const end = document.getElementById("end").value;
  const departureTime = new Date(document.getElementById("departureTime").value);


  const request = {
    origin: start,
    destination: end,
    travelMode: google.maps.TravelMode.DRIVING,
    drivingOptions: {
      departureTime: departureTime,
    },
  };


  try {
    const response = await directionsService.route(request);
    directionsRenderer.setDirections(response);

    const estimatedDurationInSeconds = response.routes[0].legs[0].duration.value;
    const estimatedArrivalTime = new Date(departureTime.getTime() + estimatedDurationInSeconds * 1000);

    updateCustomSidebar(response.routes[0].legs[0].steps, departureTime, estimatedArrivalTime);
  } catch (error) {
    window.alert(`Directions request failed due to ${error}`);
  }
}


function updateCustomSidebar(steps, departureTime, estimatedArrivalTime) {
  const customSidebar = document.getElementById("customSidebar");
  customSidebar.innerHTML = '';

  const startLocationElement = document.createElement("h1");
  startLocationElement.className = "locationInfo startLocation";
  startLocationElement.innerHTML = `${document.getElementById("start").value}`;
  customSidebar.appendChild(startLocationElement);

  const departureTimeElement = document.createElement("h3");
  departureTimeElement.className = "timeInfo departureTime";
  departureTimeElement.innerHTML = `Departure Time: ${departureTime.toLocaleString()}`;
  customSidebar.appendChild(departureTimeElement);

  steps.forEach(step => {
    const stepElement = createStepElement(step);
    customSidebar.appendChild(stepElement);
  });
  const endLocationElement = document.createElement("h1");
  endLocationElement.className = "locationInfo endLocation";
  endLocationElement.innerHTML = `${document.getElementById("end").value}`;
  customSidebar.appendChild(endLocationElement);
  const arrivalTimeElement = document.createElement("h3");
  arrivalTimeElement.className = "timeInfo estimatedArrivalTime";
  arrivalTimeElement.innerHTML = `Estimated Arrival Time: ${estimatedArrivalTime.toLocaleString()}`;
  customSidebar.appendChild(arrivalTimeElement);


}



function createStepElement(step) {
  const stepElement = document.createElement("div");
  stepElement.className = "step";
  stepElement.innerHTML = step.instructions;
  stepElement.dataset.weatherShown = "false";
  stepElement.dataset.chargersShown = "false"; 
  const { lat, lng } = step.start_location.toJSON();

  stepElement.addEventListener("click", async function() {
    if (this.dataset.weatherShown === "false") {
      await getCurrentWeather(lat, lng, this);
      await fetchEVChargers(lat, lng, this);
      this.dataset.weatherShown = "true";
      this.dataset.chargersShown = "true"; 
    } else {
      
      const weatherElement = this.querySelector(".weather");
      if (weatherElement) {
        this.removeChild(weatherElement);
      }
      
      const chargerElement = this.querySelector(".chargers"); 
      if (chargerElement) {
        this.removeChild(chargerElement);
      }
      this.dataset.weatherShown = "false";
      this.dataset.chargersShown = "false"; 
    }
  });

  return stepElement;
}



async function getCurrentWeather(lat, lon, stepElement = null) {
  const openWeatherAPIkey = config.openWeatherAPIKey;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${openWeatherAPIkey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    const weatherInfo = `Temperature: ${Math.round((data.main.temp - 273.15))}°C, Condition: ${data.weather[0].description}`;
    const weatherElement = createWeatherElement(weatherInfo);

    if (stepElement) {
      const existingWeatherElement = stepElement.querySelector(".weather");
      if (existingWeatherElement) {
        stepElement.removeChild(existingWeatherElement);
      }

      stepElement.appendChild(weatherElement);
    }
  } catch (error) {
    console.error('Error fetching weather:', error);
  }
}

function createWeatherElement(info) {
  const weatherElement = document.createElement("div");
  weatherElement.className = "weather";
  weatherElement.innerHTML = info;
  return weatherElement;
}

function showRouteUI() {
  document.getElementById("container").style.display = "flex";
  document.getElementById("customSidebar").style.display = "block";
}

async function fetchEVChargers(lat, lon, stepElement = null) {
  const apiKey = config.openChargeAPIKey;
  const url = `https://api.openchargemap.io/v3/poi/?output=json&countrycode=AU&latitude=${lat}&longitude=${lon}&key=${apiKey}&distance=10&distanceunit=KM`;

  try {
    const response = await fetch(url);
    const chargers = await response.json();

    let chargerInfoString = "";

    if (chargers.length === 0) {
      chargerInfoString = "No chargers within the area";
    } else {
      chargerInfoString = "Nearby chargers:<br>" + chargers.slice(0, 3).map((charger, index) => {
        return `${index + 1}. ${charger.AddressInfo.Title} - ${charger.AddressInfo.AddressLine1}, ${charger.AddressInfo.Town}, ${charger.AddressInfo.StateOrProvince}`;
      }).join("<br>");
    }

    const chargerElement = document.createElement("div");
    chargerElement.className = "chargers";
    chargerElement.innerHTML = chargerInfoString;
    
    if (stepElement) {
      const existingChargerElement = stepElement.querySelector(".chargers");
      if (existingChargerElement) {
        stepElement.removeChild(existingChargerElement);
      }
      stepElement.appendChild(chargerElement);
    }
  } catch (error) {
    console.error('Error fetching EV chargers:', error);
  }
}



window.initMap = initMap;

// Get stored data from session storage
const getStoredData = JSON.parse(sessionStorage.getItem("storeData"));

// API endpoints
const ONE_WAY_API =
  "https://operators-dashboard.bubbleapps.io/api/1.1/wf/webflow_one_way_flight_fractionaljetownership";
const ROUND_TRIP_API =
  "https://operators-dashboard.bubbleapps.io/api/1.1/wf/webflow_round_trip_flight_fractionaljetownership";

// Function to handle airport item clicks
function handleAirportClick(airportId, storageKey) {
  if (airportId) {
    const currentData = JSON.parse(sessionStorage.getItem("storeData"));
    currentData[storageKey] = airportId;
    sessionStorage.setItem("storeData", JSON.stringify(currentData));
    window.location.reload();
  }
}

// Function to show loading bar
function showLoading() {
  // Remove any existing loading screen
  hideLoading();
  document.querySelector("body").style.overflow = "hidden";

  const loadingScreen = document.createElement("div");
  loadingScreen.className = "loading-screen";
  loadingScreen.innerHTML = `
    <div class="loading-bar-container">
      <img src="https://cdn.prod.website-files.com/66fa75fb0d726d65d059a42d/685f88daa5e52ae1e83340e4_loading.gif" alt="" />
    </div>
  `;
  document.body.appendChild(loadingScreen);
}

// Function to hide loading bar
function hideLoading() {
  const loadingScreen = document.querySelector(".loading-screen");
  if (loadingScreen) loadingScreen.remove();
  if (window.loadingBarInterval) clearInterval(window.loadingBarInterval);
  document.querySelector("body").style.overflow = "visible";
}

async function pollForAircraft(
  flightRequestId,
  expectedSearchResults,
  expectedDepartureAirports,
  expectedArrivalAirports,
  apiUrl = "https://operators-dashboard.bubbleapps.io/api/1.1/wf/webflow_return_data_fractionaljetownership",
  maxAttempts = 50,
  interval = 2000
) {
  let attempt = 0;
  while (attempt < maxAttempts) {
    attempt++;
    console.log(`Polling attempt: ${attempt}`);
    const requestBody = { flightrequest: flightRequestId };
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    const apiResponse = data.response;

    console.log(apiResponse);

    // Check if all conditions are met
    const searchResultsMatch =
      apiResponse.aircraft.length === expectedSearchResults;
    const departureAirportsMatch =
      apiResponse.other_departure_airports.length === expectedDepartureAirports;
    const arrivalAirportsMatch =
      apiResponse.other_arrival_airports.length === expectedArrivalAirports;

    if (searchResultsMatch && departureAirportsMatch && arrivalAirportsMatch) {
      return apiResponse;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  // Make one final API call to check the latest data
  const finalResponse = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flightrequest: flightRequestId }),
  });
  const finalData = await finalResponse.json();
  const finalApiResponse = finalData.response;

  if (finalApiResponse.aircraft.length > 0) {
    return finalApiResponse;
  } else {
    const notFound = document.querySelector(".notfound");
    notFound.style.display = "flex";
    return null;
  }
}

// Helper to convert 12-hour time to 24-hour format (HH:mm:ss)
function to24HourTime(timeStr) {
  const [time, modifier] = timeStr.split(" ");
  let [hours, minutes] = time.split(":");
  if (modifier === "PM" && hours !== "12") hours = String(Number(hours) + 12);
  if (modifier === "AM" && hours === "12") hours = "00";
  return `${hours.padStart(2, "0")}:${minutes}:00`;
}

// Function to make API call
async function makeApiCall() {
  try {
    showLoading(); // Show loading screen before API call

    if (!getStoredData) {
      console.error("No stored data found");
      hideLoading(); // Hide loading screen if no data
      return;
    }

    const apiUrl =
      getStoredData.way.toLowerCase() === "one way"
        ? ONE_WAY_API
        : ROUND_TRIP_API;

    // Prepare request body based on way type
    const requestBody =
      getStoredData.way.toLowerCase() === "one way"
        ? {
            "from airport id": getStoredData.fromId,
            "to airport id": getStoredData.toId,
            date_as_text: getStoredData.dateAsText,
            time_as_text: getStoredData.timeAsText,
            App_Out_Date_As_Text: getStoredData.appDate,
            pax: getStoredData.pax,
            date:
              ensureValidDate(
                getStoredData.timeStamp,
                `${getStoredData.dateAsText}T${to24HourTime(
                  getStoredData.timeAsText
                )}`
              ) * 1000,
            fleet: getStoredData.fleet,
          }
        : {
            "out-dep airport id": getStoredData.fromId,
            "out-arr airport id": getStoredData.toId,
            "ret-dep airport id": getStoredData.returnFromId,
            "ret-arr airport id": getStoredData.returnToId,
            "out-dep date":
              ensureValidDate(
                getStoredData.timeStamp,
                `${getStoredData.dateAsText}T${to24HourTime(
                  getStoredData.timeAsText
                )}`
              ) * 1000,
            "ret-date":
              ensureValidDate(
                getStoredData.timeStampReturn,
                `${getStoredData.returnDateAsText}T${to24HourTime(
                  getStoredData.timeAsTextReturn
                )}`
              ) * 1000,
            "out-pax": getStoredData.pax,
            "ret-pax": getStoredData.paxReturn,
            Dep_date_as_text: getStoredData.dateAsText,
            Ret_date_as_text: getStoredData.returnDateAsText,
            Dep_time_as_text: getStoredData.timeAsText,
            Ret_time_as_text: getStoredData.timeAsTextReturn,
            App_Out_Date_As_Text: getStoredData.appDate,
            App_Ret_Date_As_Text: getStoredData.appDateReturn,
            fleet: getStoredData.fleet,
          };

    // First API call
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const apiResponse = data.response;

    // Log the expected keys from first API response
    console.log(
      "Expected Search Results:",
      apiResponse["Expected Search Results"]
    );
    console.log(
      "Expected Alternate Departure Airports:",
      apiResponse["Expected Alternate Departure Airports"]
    );
    console.log(
      "Expected Alternate Arrival Airports:",
      apiResponse["Expected Alternate Arrival Airports"]
    );

    // Get flightrequest from first API response
    const flightRequestId = apiResponse.flightrequest;
    console.log("Flight Request ID from 1st API:", flightRequestId);

    // Save flightRequestId in sessionStorage as an array
    let storedFlightIds = JSON.parse(
      sessionStorage.getItem("flightRequestId") || "[]"
    );
    if (flightRequestId && !storedFlightIds.includes(flightRequestId)) {
      storedFlightIds.push(flightRequestId);
      sessionStorage.setItem(
        "flightRequestId",
        JSON.stringify(storedFlightIds)
      );

      // Check if user is logged in and send the data
      const userEmail =
        typeof Cookies !== "undefined" ? Cookies.get("userEmail") : null;
      const authToken =
        typeof Cookies !== "undefined" ? Cookies.get("authToken") : null;
      if (userEmail && authToken) {
        sendFlightRequestIdsIfLoggedIn();
      }
    }
    if (!flightRequestId) {
      alert("No flightrequest ID returned from the first API call.");
      hideLoading();
      return;
    }

    // Poll the second API for aircraft data with expected counts
    const aircraftResponse = await pollForAircraft(
      flightRequestId,
      apiResponse["Expected Search Results"],
      apiResponse["Expected Alternate Departure Airports"],
      apiResponse["Expected Alternate Arrival Airports"]
    );
    if (!aircraftResponse) {
      hideLoading();
      return;
    }

    // After receiving aircraftResponse (2nd API response)
    // Add logic to toggle active_fleet class based on aircraftResponse.fleet
    if (aircraftResponse && aircraftResponse.fleet) {
      const eqflElem = document.querySelector(".eqfl");
      const rbsflElem = document.querySelector(".rbsfl");
      if (aircraftResponse.fleet === "EQUITY") {
        if (eqflElem) eqflElem.classList.add("active_fleet");
        if (rbsflElem) rbsflElem.classList.remove("active_fleet");
      } else if (aircraftResponse.fleet === "RESERVE") {
        if (rbsflElem) rbsflElem.classList.add("active_fleet");
        if (eqflElem) eqflElem.classList.remove("active_fleet");
      }
    }

    const acResultCnt = document.querySelector(".ac_result_cnt");
    const airPopUp = document.querySelector(".airpopup");
    const apiAircraft = aircraftResponse.aircraft;
    const sampleFleetList = aircraftResponse.sample_fleet_list;
    acResultCnt.innerHTML = "";

    if (acResultCnt && apiAircraft) {
      apiAircraft.forEach((aircraft, index) => {
        acResultCnt.innerHTML += `
      <div class="ap_aircraft" data-index="${index}" aircraft-id = "${
          aircraft._id
        }">
        <div class="ap_aircraft_details">  
          <div class="apac_img">
            <img src="${aircraft.aircraft_image_image}" alt="" />
          </div>
          <div class="price_block_gen">
            <div class="apac_details">
              <h4>${aircraft.category_text}</h4>
              <p>${aircraft.models_text}</p>
            </div>
            <div class="ap_aircraft_details_price">
              <div class="ap_aircraft_toptip">
                <h4><sup>$</sup>${Math.round(
                  aircraft.price_number
                ).toLocaleString()} </h4>
                <div class="ap_aircraft_tip_text">
                  <span><img src="https://cdn.prod.website-files.com/66fa75fb0d726d65d059a42d/6825cd8e306cd13add181479_toltip.png" alt="" /></span>
                  <p>Total includes taxes and Government Imposed Passenger Fee and fees</p>
                </div>
              </div>
              <p>${aircraft.flight_time_text}</p>
            </div>
          </div>
        </div>
        <div class="ap_aircraft_message">
          <div class="ap_aircraft_message_left">
            <p>${aircraft.message_text}</p>
          </div>
          <div class="ap_aircraft_message_right">
            <button class="learn-more-btn" data-index="${index}">Learn More</button>
          </div>
        </div>
        <div class="ap_aircraft_continue" style="display: none;">
          <a href="#">Continue <img src="https://cdn.prod.website-files.com/66fa75fb0d726d65d059a42d/680d2633fe670f2024b6738a_arr.png" alt="" /></a>
        </div>
      </div>
    `;
      });

      document.querySelectorAll(".ap_aircraft").forEach((aircraft) => {
        aircraft.addEventListener("click", function () {
          const continueDiv = this.querySelector(".ap_aircraft_continue");
          continueDiv.style.display =
            continueDiv.style.display === "none" ? "block" : "none";
          this.classList.toggle("active");
        });
      });

      document.querySelectorAll(".learn-more-btn").forEach((button) => {
        button.addEventListener("click", function (e) {
          e.stopPropagation();
          document.querySelector(".airc_pop_wrapper").style.display = "flex";
          document.querySelector("body").style.overflow = "hidden";
          airPopUp.innerHTML = "";
          const index = this.getAttribute("data-index");
          const aircraft = apiAircraft[index];
          const matchedFleet = sampleFleetList.filter((fleet) =>
            aircraft.sample_fleet_list1_list_custom_blackjet_sample_fleet.includes(
              fleet._id
            )
          );

          airPopUp.innerHTML = `
            <div class="airpopup-content">
             <div class="airup_cnt_heading">
                <h3>${aircraft.category_text}</h3>
                <span class="close-popup"><img src="https://cdn.prod.website-files.com/66fa75fb0d726d65d059a42d/68123d9f2800197a5c59ee0a_crossx.png" alt="cross icon" /></span>
             </div>
             <div class="airup_cnt_discription">
              <p>${aircraft.category_description_text}</p>
             </div>
             <div class="ariup_feature">
              <div class="airupf_item">
                <p> <img src="https://cdn.prod.website-files.com/66fa75fb0d726d65d059a42d/68519626e858c6c8d960758a_clock.png" alt="time icon" /> ${
                  aircraft.flight_time_text
                }</p>
              </div>
              ${
                aircraft.minibar__boolean
                  ? `
              <div class="airupf_item">
                <p> <img src="https://cdn.prod.website-files.com/66fa75fb0d726d65d059a42d/685196262f78b69ae5779e94_glass.png" alt="icon" /> Mini bar</p>
              </div>
              `
                  : ""
              }
              ${
                aircraft.restroom__boolean
                  ? `
              <div class="airupf_item">
                <p> <img src="https://cdn.prod.website-files.com/66fa75fb0d726d65d059a42d/685196268349fe3d55e0b49b_restroom.png" alt="icon" /> Restroom</p>
              </div>
              `
                  : ""
              }
              ${
                aircraft.wifi__boolean
                  ? `
              <div class="airupf_item">
                <p> <img src="https://cdn.prod.website-files.com/66fa75fb0d726d65d059a42d/6851962627e66b384a53a152_wifi.png" alt="icon" /> Wi-fi</p>
              </div>
              `
                  : ""
              }
             </div>
             <div class="aircraft_class_wrapper">
              <h3>Aircraft in this class</h3>
              <div class="aircraft_class_cnt">
                <div class="ac_flightItem">
                ${matchedFleet
                  .map(
                    (fleet) => `
                  <div class="ac_fleet-item">
                    <div class="acfi_left">
                      <img src="${fleet.image_image}" alt="aircraft_img" />
                    </div>
                    <div class="acfi_right">
                      <h3>${fleet.display_text}</h3>
                      <div class="acfi_right_feature">
                        <ul>
                          <li>${fleet.seats_text}</li>
                          <li>${fleet.luggage_text}</li>
                          <li>${fleet.speed_text}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>
              </div>
             </div>
              
            </div>
          `;

          // Add click event listener to close popup
          document
            .querySelector(".close-popup")
            .addEventListener("click", function () {
              document.querySelector(".airc_pop_wrapper").style.display =
                "none";
              document.querySelector("body").style.overflow = "visible";
            });
        });
      });

      // click event for continue button
      const continueBtn = document.querySelectorAll(".ap_aircraft_continue a");
      continueBtn.forEach((cntBtn) => {
        cntBtn.addEventListener("click", function (e) {
          e.stopPropagation();

          // Save flightRequestId and aircraft id in sessionStorage
          if (typeof flightRequestId !== "undefined") {
            sessionStorage.setItem("frequestid", flightRequestId);
          }
          const aircraftDiv = this.closest(".ap_aircraft");
          if (aircraftDiv) {
            const aircraftId = aircraftDiv.getAttribute("aircraft-id");
            if (aircraftId) {
              sessionStorage.setItem("aircraftid", aircraftId);
            }
          }

          // Check if user is logged in using cookies
          if (
            typeof Cookies !== "undefined" &&
            Cookies.get("userEmail") &&
            Cookies.get("authToken")
          ) {
            // User is logged in, redirect to homepage
            window.location.href = "/checkout";
          } else {
            const authPopUpWrapper = document.querySelector(".auth-popup");
            const authBlockPopup = document.querySelector(".auth_block_popup");
            const authForget = document.querySelector(".auth_forget");

            authPopUpWrapper.classList.add("active_popup");
            authBlockPopup.style.display = "block";
            authForget.style.display = "none";
            document.querySelector("#signin").classList.add("active_form");
            document.querySelector("#signup").classList.remove("active_form");
            document.querySelector("[data='signin']").style.display = "block";
            document.querySelector("[data='signup']").style.display = "none";
            sessionStorage.setItem("redirectAfterLogin", "true");
          }
        });
      });
    }

    //! creating map start
    const fromAirport = {
      name: apiResponse.flight_legs[0].mobile_app_from_airport_name_short_text,
      code:
        apiResponse.flight_legs[0].mobile_app_from_airport_faa_code_text ||
        apiResponse.flight_legs[0].mobile_app_from_airport_iata_code_text ||
        apiResponse.flight_legs[0].mobile_app_from_airport_icao_code_text,
      coordinates: [
        apiResponse.flight_legs[0].mobile_app_from_longitude_number,
        apiResponse.flight_legs[0].mobile_app_from_latitude_number,
      ],
    };

    const toAirport = {
      name: apiResponse.flight_legs[0].mobile_app_to_airport_name_short_text,
      code:
        apiResponse.flight_legs[0].mobile_app_to_airport_faa_code_text ||
        apiResponse.flight_legs[0].mobile_app_to_airport_iata_code_text ||
        apiResponse.flight_legs[0].mobile_app_to_airport_icao_code_text,
      coordinates: [
        apiResponse.flight_legs[0].mobile_app_to_longitude_number,
        apiResponse.flight_legs[0].mobile_app_to_latitude_number,
      ],
    };

    const isMobile = window.innerWidth < 992;

    mapboxgl.accessToken =
      "pk.eyJ1IjoiYmFidTg3NjQ3IiwiYSI6ImNtOXF5dTEyYjF0MWIyam9pYjM4cmhtY28ifQ.z0mjjPx_wTlAA_wrzhzitA";

    const map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/light-v11",
      center: turf.midpoint(fromAirport.coordinates, toAirport.coordinates)
        .geometry.coordinates,
      zoom: isMobile ? 1 : 3,
      minZoom: 1,
    });

    let flightPathBounds; // For reuse on window resize
    let resizeTimeout; // For debouncing resize events

    map.on("load", () => {
      // 1. Generate "Other Airports" dots
      const numOtherAirports = 2000;
      const otherAirportsFeatures = [];
      const mapVisibleBounds = map.getBounds();
      const west = mapVisibleBounds.getWest();
      const south = mapVisibleBounds.getSouth();
      const east = mapVisibleBounds.getEast();
      const north = mapVisibleBounds.getNorth();

      for (let i = 0; i < numOtherAirports; i++) {
        otherAirportsFeatures.push(
          turf.randomPoint(1, { bbox: [west, south, east, north] }).features[0]
        );
      }
      const otherAirportsGeoJSON = turf.featureCollection(
        otherAirportsFeatures
      );

      map.addSource("other-airports", {
        type: "geojson",
        data: otherAirportsGeoJSON,
      });

      map.addLayer({
        id: "other-airports-layer",
        type: "circle",
        source: "other-airports",
        paint: {
          "circle-radius": 1.5,
          "circle-color": "#777777",
          "circle-opacity": 0.6,
        },
      });

      // 2. Create the Flight Path
      const route = turf.greatCircle(
        turf.point(fromAirport.coordinates),
        turf.point(toAirport.coordinates),
        { npoints: 100 }
      );

      map.addSource("flight-path", {
        type: "geojson",
        data: route,
      });

      map.addLayer({
        id: "flight-path-layer",
        type: "line",
        source: "flight-path",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#000000",
          "line-width": 2,
          "line-dasharray": [2, 2],
        },
      });

      // 3. Add Airplane Icon
      map.loadImage(
        "https://cdn.prod.website-files.com/66fa75fb0d726d65d059a42d/6784edaa72ef1dafeb837b62_aroplane.avif",
        (error, image) => {
          if (error) throw error;
          if (!map.hasImage("airplane-icon")) {
            map.addImage("airplane-icon", image, { sdf: false });
          }

          const routeDistance = turf.length(route);
          const airplanePositionPoint = turf.along(route, routeDistance * 0.8);
          const pointSlightlyBefore = turf.along(route, routeDistance * 0.79);
          const bearing = turf.bearing(
            pointSlightlyBefore,
            airplanePositionPoint
          );

          map.addSource("airplane-source", {
            type: "geojson",
            data: airplanePositionPoint,
          });

          map.addLayer({
            id: "airplane-layer",
            type: "symbol",
            source: "airplane-source",
            layout: {
              "icon-image": "airplane-icon",
              "icon-size": 1,
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              "icon-rotate": bearing - 90,
            },
          });
        }
      );

      // 4. Custom Airport Markers
      const elFrom = document.createElement("div");
      elFrom.className = "airport-marker";
      elFrom.innerHTML = `
<div class="airport-info">
  <svg class="plane-icon" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
  ${fromAirport.name}
</div>
<div class="airport-code">${fromAirport.code}</div>
`;
      new mapboxgl.Marker(elFrom, { offset: [55, 0] })
        .setLngLat(fromAirport.coordinates)
        .addTo(map);

      const elTo = document.createElement("div");
      elTo.className = "airport-marker";
      elTo.innerHTML = `
<div class="airport-info">
  <svg class="plane-icon" viewBox="0 0 24 24"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>
  ${toAirport.name}
</div>
<div class="airport-code">${toAirport.code}</div>
`;
      new mapboxgl.Marker(elTo, { offset: [45, 0] })
        .setLngLat(toAirport.coordinates)
        .addTo(map);

      // 5. Add filled circles for origin and destination airports
      map.addSource("origin-dest-points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            turf.point(fromAirport.coordinates),
            turf.point(toAirport.coordinates),
          ],
        },
      });
      map.addLayer({
        id: "origin-dest-circles",
        type: "circle",
        source: "origin-dest-points",
        paint: {
          "circle-radius": 5,
          "circle-color": "#000000",
          "circle-stroke-color": "#FFFFFF",
          "circle-stroke-width": 1.5,
        },
      });

      // 6. Fit map to bounds
      flightPathBounds = new mapboxgl.LngLatBounds();
      route.geometry.coordinates.forEach((coord) => {
        flightPathBounds.extend(coord);
      });

      const isMobile = window.innerWidth < 768;
      map.fitBounds(flightPathBounds, {
        padding: isMobile
          ? { top: 50, bottom: 50, left: 50, right: 50 }
          : { top: 100, bottom: 100, left: 150, right: 150 },
      });

      // 7. SOLUTION 2: ResizeObserver - Watches for container size changes
      const mapContainer = document.getElementById("map");

      // Create a ResizeObserver to watch the map container
      const resizeObserver = new ResizeObserver((entries) => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          map.resize();
          if (flightPathBounds) {
            const isMobile = window.innerWidth < 768;
            map.fitBounds(flightPathBounds, {
              padding: isMobile
                ? { top: 50, bottom: 50, left: 50, right: 50 }
                : { top: 100, bottom: 100, left: 150, right: 150 },
            });
          }
        }, 150);
      });

      // Start observing the map container
      resizeObserver.observe(mapContainer);

      // Alternative: MutationObserver for class changes (if sidebar toggle changes classes)
      const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            mutation.attributeName === "class"
          ) {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
              map.resize();
              if (flightPathBounds) {
                const isMobile = window.innerWidth < 768;
                map.fitBounds(flightPathBounds, {
                  padding: isMobile
                    ? { top: 50, bottom: 50, left: 50, right: 50 }
                    : { top: 100, bottom: 100, left: 150, right: 150 },
                });
              }
            }, 300);
          }
        });
      });

      // Watch for class changes on the body or main container that might affect sidebar
      mutationObserver.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });

      // Also watch the parent container of the map (in case it has class changes)
      const mapParent = mapContainer.parentElement;
      if (mapParent) {
        mutationObserver.observe(mapParent, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    });

    // 8. Enhanced window resize handler (backup solution)
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        map.resize();
        if (flightPathBounds) {
          const isMobile = window.innerWidth < 768;
          map.fitBounds(flightPathBounds, {
            padding: isMobile
              ? { top: 50, bottom: 50, left: 50, right: 50 }
              : { top: 100, bottom: 100, left: 150, right: 150 },
          });
        }
      }, 100);
    });

    // 9. Optional: If you know the specific sidebar toggle button, add this
    // Replace '.sidebar-toggle-button' with your actual button selector
    const sidebarToggleButton = document.querySelector(
      ".sidebar-toggle-button"
    );
    if (sidebarToggleButton) {
      sidebarToggleButton.addEventListener("click", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          map.resize();
          if (flightPathBounds) {
            const isMobile = window.innerWidth < 768;
            map.fitBounds(flightPathBounds, {
              padding: isMobile
                ? { top: 50, bottom: 50, left: 50, right: 50 }
                : { top: 100, bottom: 100, left: 150, right: 150 },
            });
          }
        }, 350); // Slightly longer delay to account for sidebar animation
      });
    }
    //! creating map end

    //? Code for right side content - start
    const departureArea = document.querySelector(".ac_dep_loop");
    const arrivalArea = document.querySelector(".ac_arive_loop");
    const departureAirport = aircraftResponse.other_departure_airports;
    const arrivalAirport = aircraftResponse.other_arrival_airports;
    aircraftResponse;
    if (departureArea && departureAirport) {
      departureArea.innerHTML = "";
      // Sort by distance (ascending)
      departureAirport
        .slice() // create a shallow copy to avoid mutating the original array
        .sort((a, b) => {
          // Handle missing or non-numeric values gracefully
          const distA =
            typeof a.distance_to_original_departure_airport_number === "number"
              ? a.distance_to_original_departure_airport_number
              : Infinity;
          const distB =
            typeof b.distance_to_original_departure_airport_number === "number"
              ? b.distance_to_original_departure_airport_number
              : Infinity;
          return distA - distB;
        })
        .forEach((depAirport) => {
          const isActive =
            getStoredData &&
            getStoredData.fromId === depAirport.airport_id_text;
          departureArea.innerHTML += `
            <div class="depair_item depair_item_click ${
              isActive ? "active" : ""
            }" data-id="${depAirport.airport_id_text}">
              <div class="short_code">
                <p>${
                  depAirport.faa_code_text ||
                  depAirport.icao_code_text ||
                  depAirport.iata_code_text ||
                  "N/A"
                }
              </div>
              <div class="depair_item_wrapper">
                <div class="depair_item_left">
                <h3>${depAirport.airport_name_short_text}</h3>
                <p>
                  ${depAirport.location_label_text} <span></span>
                  ${
                    typeof depAirport.distance_to_original_departure_airport_number ===
                    "number"
                      ? depAirport.distance_to_original_departure_airport_number.toFixed(
                          1
                        )
                      : "N/A"
                  } mi
                </p>
              </div>
              <div class="depair_item_right">
                <p>$${
                  depAirport.light_jet_price_number
                    ? depAirport.light_jet_price_number.toLocaleString()
                    : "N/A"
                }</p>
              </div>
              </div>
            </div>
          `;
        });

      // Add click event listeners to departure items
      document.querySelectorAll(".depair_item_click").forEach((item) => {
        item.addEventListener("click", function () {
          // Remove active class from all departure items
          document
            .querySelectorAll(".depair_item_click")
            .forEach((i) => i.classList.remove("active"));

          // Add active class to clicked item
          this.classList.add("active");
          const airportId = this.getAttribute("data-id");

          // Find the matching airport data from API response
          const selectedAirport =
            aircraftResponse.other_departure_airports.find(
              (airport) => airport.airport_id_text === airportId
            );

          if (selectedAirport) {
            const currentData =
              JSON.parse(sessionStorage.getItem("storeData")) || {};
            // Update formIdInput with airport name
            currentData.formIdInput = selectedAirport.airport_name_short_text;
            // Update fromShortCode with appropriate code
            currentData.fromShortCode =
              selectedAirport.faa_code_text ||
              selectedAirport.icao_code_text ||
              selectedAirport.iata_code_text ||
              "";
            sessionStorage.setItem("storeData", JSON.stringify(currentData));
          }

          handleAirportClick(airportId, "fromId");
        });
      });

      // Display the see more button and click event for displaying all items for Departure
      const itemCount = departureAirport.length;
      const seeMoreElement = document.querySelector(".ac_dep_see.seemore_dep");

      if (itemCount > 5 && seeMoreElement) {
        seeMoreElement.style.display = "flex";
      } else if (seeMoreElement) {
        seeMoreElement.style.display = "none";
      }
    }

    if (arrivalArea && arrivalAirport) {
      arrivalArea.innerHTML = "";
      arrivalAirport
        .slice()
        .sort((a, b) => {
          const distA =
            typeof a.distance_to_original_departure_airport_number === "number"
              ? a.distance_to_original_departure_airport_number
              : Infinity;
          const distB =
            typeof b.distance_to_original_departure_airport_number === "number"
              ? b.distance_to_original_departure_airport_number
              : Infinity;
          return distA - distB;
        })
        .forEach((arrAirport) => {
          const isActive =
            getStoredData && getStoredData.toId === arrAirport.airport_id_text;
          arrivalArea.innerHTML += `
            <div class="depair_item airval_item_click ${
              isActive ? "active" : ""
            }" data-id="${arrAirport.airport_id_text}">
              <div class="short_code">
                <p>${
                  arrAirport.faa_code_text ||
                  arrAirport.icao_code_text ||
                  arrAirport.iata_code_text ||
                  ""
                }
              </div>
              <div class="depair_item_wrapper">
                <div class="depair_item_left">
                <h3>${arrAirport.airport_name_short_text}</h3>
                <p>
                  ${arrAirport.location_label_text} <span></span>
                  ${
                    typeof arrAirport.distance_to_original_departure_airport_number ===
                    "number"
                      ? arrAirport.distance_to_original_departure_airport_number.toFixed(
                          1
                        )
                      : "N/A"
                  } mi
                </p>
              </div>
              <div class="depair_item_right">
                <p>$${
                  arrAirport.light_jet_price_number
                    ? arrAirport.light_jet_price_number.toLocaleString()
                    : "N/A"
                }</p>
              </div>
              </div>
            </div>
          `;
        });

      // Add click event listeners to arrival items
      document.querySelectorAll(".airval_item_click").forEach((item) => {
        item.addEventListener("click", function () {
          // Remove active class from all arrival items
          document
            .querySelectorAll(".airval_item_click")
            .forEach((i) => i.classList.remove("active"));

          // Add active class to clicked item
          this.classList.add("active");

          const airportId = this.getAttribute("data-id");

          // Find the matching airport data from API response
          const selectedAirport = aircraftResponse.other_arrival_airports.find(
            (airport) => airport.airport_id_text === airportId
          );

          if (selectedAirport) {
            const currentData =
              JSON.parse(sessionStorage.getItem("storeData")) || {};
            // Update toIdInput with airport name
            currentData.toIdInput = selectedAirport.airport_name_short_text;
            // Update toShortCode with appropriate code
            currentData.toShortCode =
              selectedAirport.faa_code_text ||
              selectedAirport.icao_code_text ||
              selectedAirport.iata_code_text ||
              "";
            sessionStorage.setItem("storeData", JSON.stringify(currentData));
          }

          handleAirportClick(airportId, "toId");
        });
      });

      // Display the see more button and click event for displaying all items for Arrival
      const itemCount = arrivalAirport.length;
      const seeMoreElement = document.querySelector(
        ".ac_dep_see.seemore_arive"
      );

      if (itemCount > 5 && seeMoreElement) {
        seeMoreElement.style.display = "flex";
      } else if (seeMoreElement) {
        seeMoreElement.style.display = "none";
      }
    }

    //? Code for right side content - end

    // Add click event listeners for fleet toggles
    const eqflElem = document.querySelector(".eqfl");
    const rbsflElem = document.querySelector(".rbsfl");
    if (eqflElem) {
      eqflElem.addEventListener("click", function () {
        const currentData =
          JSON.parse(sessionStorage.getItem("storeData")) || {};
        currentData.fleet = "EQUITY";
        sessionStorage.setItem("storeData", JSON.stringify(currentData));
        window.location.reload();
      });
    }
    if (rbsflElem) {
      rbsflElem.addEventListener("click", function () {
        const currentData =
          JSON.parse(sessionStorage.getItem("storeData")) || {};
        currentData.fleet = "RESERVE";
        sessionStorage.setItem("storeData", JSON.stringify(currentData));
        window.location.reload();
      });
    }

    // Hide Departure and Arrival if needed
    const deptopElem = document.querySelector(".ac_dept_block_cnt");
    const arrivetopElem = document.querySelector(".ac_arrive_block_cnt");
    const arrowIcon = document.querySelector(".ac_dep_heading_right");
    const noDep = aircraftResponse.other_departure_airports.length === 0;
    const noArr = aircraftResponse.other_arrival_airports.length === 0;
    if (deptopElem && noDep) {
      deptopElem.innerHTML = `<p class="no-airport">No Alternate Airports Nearby</p>`;
    }
    if (arrivetopElem && noArr) {
      arrivetopElem.innerHTML = `<p class="no-airport">No Alternate Airports Nearby</p>`;
    }
    if (noDep && noArr) {
      if (arrowIcon) arrowIcon.style.display = "none";
    }

    return { data, fromAirport, toAirport };
  } catch (error) {
    console.error("Error making API call:", error);
    hideLoading(); // Hide loading screen on error
    throw error;
  } finally {
    hideLoading(); // Hide loading screen after API call completes
  }
}

// Call the API when the page loads
document.addEventListener("DOMContentLoaded", () => {
  makeApiCall();
});

// Helper function for reliable date handling
function createTimestamp(dateText) {
  if (!dateText) return null;
  try {
    const [year, month, day] = dateText.split("-").map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    const dateObject = new Date(Date.UTC(year, month - 1, day, 0, 0));
    if (isNaN(dateObject.getTime())) return null;
    // Convert to seconds for API
    return Math.floor(dateObject.getTime() / 1000);
  } catch (error) {
    console.error("Error creating timestamp:", error);
    return null;
  }
}

// Helper function to ensure valid date
function ensureValidDate(timestamp, dateText) {
  if (!timestamp || timestamp === 0) {
    // If timestamp is invalid, try to create one from dateText
    return createTimestamp(dateText);
  }
  return timestamp;
}

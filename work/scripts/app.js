// Copyright 2016 Google Inc.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//      http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


function initApp(apiKey) {
    'use strict';

    var app = {
        isLoading: true,
        visibleCards: {},
        selectedCities: [],
        spinner: document.querySelector('.loader'),
        cardTemplate: document.querySelector('.cardTemplate'),
        container: document.querySelector('.main'),
        addDialog: document.querySelector('.dialog-container'),
        daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        apiKey
    };


    /*****************************************************************************
     *
     * Event listeners for UI elements
     *
     ****************************************************************************/

    document.getElementById('butRefresh').addEventListener('click', function () {
        // Refresh all of the forecasts
        app.updateForecasts();
    });

    document.getElementById('butAdd').addEventListener('click', function () {
        // Open/show the add new city dialog
        app.toggleAddDialog(true);
    });

    document.getElementById('butAddCity').addEventListener('click', function () {
        // Add the newly selected city
        var select = document.getElementById('selectCityToAdd');
        var selected = select.options[select.selectedIndex];
        var key = selected.value;
        var label = selected.textContent;

        if (typeof app.selectedCities === 'undefined') {
            app.selectedCities = [];
        }

        app.getForecast(key, label);

        app.selectedCities.push({key, label});
        app.saveSelectedCities();

        app.toggleAddDialog(false);
    });

    document.getElementById('butAddCancel').addEventListener('click', function () {
        // Close the add new city dialog
        app.toggleAddDialog(false);
    });


    /*****************************************************************************
     *
     * Methods to update/refresh the UI
     *
     ****************************************************************************/

    // Toggles the visibility of the add new city dialog.
    app.toggleAddDialog = function (visible) {
        if (visible) {
            app.addDialog.classList.add('dialog-container--visible');
        } else {
            app.addDialog.classList.remove('dialog-container--visible');
        }
    };

    // Updates a weather card with the latest weather forecast. If the card
    // doesn't already exist, it's cloned from the template.
    app.updateForecastCard = function (data) {
        var dataLastUpdated = new Date(data.created);
        var current = data.channel.item.condition;
        var humidity = data.channel.atmosphere.humidity;
        var wind = data.channel.wind;

        var card = app.visibleCards[data.key];
        if (!card) {
            card = app.cardTemplate.cloneNode(true);
            card.classList.remove('cardTemplate');
            card.querySelector('.location').textContent = data.label;
            card.removeAttribute('hidden');
            app.container.appendChild(card);
            app.visibleCards[data.key] = card;
        }

        // Verifies the data provide is newer than what's already visible
        // on the card, if it's not bail, if it is, continue and update the
        // time saved in the card
        var cardLastUpdatedElem = card.querySelector('.card-last-updated');
        var cardLastUpdated = cardLastUpdatedElem.textContent;
        if (cardLastUpdated) {
            cardLastUpdated = new Date(cardLastUpdated);
            // Bail if the card has more recent data then the data
            if (dataLastUpdated.getTime() < cardLastUpdated.getTime()) {
                return;
            }
        }
        cardLastUpdatedElem.textContent = data.created;

        card.querySelector('.description').textContent = current.text;
        card.querySelector('.date').textContent = current.date;
        card.querySelector('.current .icon').classList.add(app.getIconClass(current.code));
        card.querySelector('.current .temperature .value').textContent =
            Math.round(current.temp);
        // card.querySelector('.current .sunrise').textContent = sunrise;
        // card.querySelector('.current .sunset').textContent = sunset;
        card.querySelector('.current .humidity').textContent =
            Math.round(humidity) + '%';
        card.querySelector('.current .wind .value').textContent =
            Math.round(wind.speed);
        card.querySelector('.current .wind .direction').textContent = wind.direction;
        var nextDays = card.querySelectorAll('.future .oneday');
        var today = new Date();
        today = today.getDay();
        for (var i = 0; i < 5; i++) {
            var nextDay = nextDays[i];
            var daily = data.channel.item.forecast[i];
            if (daily && nextDay) {
                nextDay.querySelector('.date').textContent =
                    app.daysOfWeek[(i + today) % 7];
                nextDay.querySelector('.icon').classList.add(app.getIconClass(daily.code));
                nextDay.querySelector('.temp-high .value').textContent =
                    Math.round(daily.high);
                nextDay.querySelector('.temp-low .value').textContent =
                    Math.round(daily.low);
            }
        }
        if (app.isLoading) {
            app.spinner.setAttribute('hidden', true);
            app.container.removeAttribute('hidden');
            app.isLoading = false;
        }
    };

    /*****************************************************************************
     *
     * Methods for dealing with the model
     *
     ****************************************************************************/

    /*
     * Gets a forecast for a specific city and updates the card with the data.
     * getForecast() first checks if the weather data is in the cache. If so,
     * then it gets that data and populates the card with the cached data.
     * Then, getForecast() goes to the network for fresh data. If the network
     * request goes through, then the card gets updated a second time with the
     * freshest data.
     */
    app.getForecast = function (key, label) {
        var url = `https://api.openweathermap.org/data/2.5/forecast?units=metric&mode=json&id=${key}&appid=${app.apiKey}`;
        console.log('Start getForcast', url);
        console.log(new Date().toLocaleTimeString(), new Date().getMilliseconds());
        getCachedUrl(url, key, label);

        // Fetch the latest data.
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    console.log('HTTP Request', url);
                    console.log(new Date().toLocaleTimeString(), new Date().getMilliseconds());
                    processAndUpdateForecastData(request.response, key, label);
                }
            } else {
                // Return the initial weather forecast since no data is available.
                app.updateForecastCard(initialWeatherForecast);
            }
        };
        request.open('GET', url);
        request.send();
    };

    // Iterate all of the cards and attempt to get the latest forecast data
    app.updateForecasts = function () {
        var keys = Object.keys(app.visibleCards);
        keys.forEach(function (key) {
            app.getForecast(key);
        });
    };

    // Save list of cities to localStorage.
    app.saveSelectedCities = function () {
        var selectedCities = JSON.stringify(app.selectedCities);
        localStorage.selectedCities = selectedCities;
    };

    app.getIconClass = function (weatherCode) {
        // Weather codes: https://developer.yahoo.com/weather/documentation.html#codes
        weatherCode = parseInt(weatherCode);
        switch (weatherCode) {
            case 800: // clear
                return 'clear-day';
            case 500: // light rain
            case 501: // moderate rain
            case 502: // heavy intensity rain
            case 503: // very heavy rain
            case 504: // extreme rain
            case 511: // freezing rain
            case 520: // light intensity shower rain
            case 521: // shower rain
            case 522: // heavy intensity shower rain
            case 531: // ragged shower rain
            case 300: // light intensity drizzle
            case 301: // drizzle
            case 302: // heavy intensity drizzle
            case 310: // light intensity drizzle rain
            case 311: // drizzle rain
            case 312: // heavy intensity drizzle rain
            case 313: // shower rain and drizzle
            case 314: // heavy shower rain and drizzle
            case 321: // shower drizzle
                return 'rain';
            case 200: // thunderstorm with light rain
            case 201: // thunderstorm with rain
            case 202: // thunderstorm with heavy rain
            case 210: // light thunderstorm
            case 211: // thunderstorm
            case 212: // heavy thunderstorm
            case 221: // ragged thunderstorm
            case 230: // thunderstorm with light drizzle
            case 231: // thunderstorm with drizzle
            case 232: // thunderstorm with heavy drizzle
                return 'thunderstorms';
            case 600: // light snow
            case 601: // snow
            case 602: // heavy snow
            case 611: // sleet
            case 612: // shower sleet
            case 615: // light rain and snow
            case 616: // rain and snow
            case 620: // light shower snow
            case 621: // shower snow
            case 622: // heavy shower snow
                return 'snow';
            case 701: // mist
            case 711: // smoky
            case 721: // haze
            case 731: // sand, dust whirls
            case 741: // fog
            case 751: // sand
            case 761: // dust
            case 762: // volcanic ash
                return 'fog';
            case 771: // squalls
            case 781: // tornado
                return 'windy';
            case 803: // broken clouds
            case 804: // overcast clouds
                return 'cloudy';
            case 801: // few clouds
            case 802: // scattered clouds
                return 'partly-cloudy-day';
        }
    };

    /*
     * Fake weather data that is presented when the user first uses the app,
     * or when the user has not saved any cities. See startup code for more
     * discussion.
     */
    var initialWeatherForecast = {
        key: '5128581',
        label: 'New York, NY',
        created: '2016-07-22T01:00:00Z',
        channel: {
            astronomy: {
                sunrise: "5:43 am",
                sunset: "8:21 pm"
            },
            item: {
                condition: {
                    text: "Windy",
                    date: "Thu, 21 Jul 2016 09:00 PM EDT",
                    temp: 13,
                    code: 803
                },
                forecast: [
                    {code: 801, high: 30, low: 21},
                    {code: 801, high: 34, low: 22},
                    {code: 200, high: 35, low: 26},
                    {code: 803, high: 24, low: 32},
                    {code: 803, high: 32, low: 25}
                ]
            },
            atmosphere: {
                humidity: 56
            },
            wind: {
                speed: 25,
                direction: 195
            }
        }
    };
    // TODO uncomment line below to test app with fake data
    // app.updateForecastCard(initialWeatherForecast);

    /*****************************************************************************
     *
     * Helper methods
     *
     ****************************************************************************/

    // Parse the results given by OpenWeatherMaps API
    // Return object for updateForecastCard to consume
    function parseResponse(apiResponse) {

        var response = apiResponse;
        if (typeof response === 'string') {
            response = JSON.parse(response);
        }

        var
            tomorrow = response.list[0],
            condition = {
                text: tomorrow.weather[0].main,
                date: new Date(tomorrow.dt_txt).toString(),
                temp: tomorrow.main.temp,
                code: tomorrow.weather[0].id
            },
            atmosphere = {
                humidity: tomorrow.main.humidity
            },
            wind = {
                speed: tomorrow.wind.speed,
                direction: Math.round(tomorrow.wind.deg)
            },
            forecast = [];

        // Since our data is broken up by 3 hour chunks
        // Start at 7th index to skip the 0th index (tomorrow) which we already parsed
        for (var i = 7; i < response.list.length; i += 8) {

            // If we want to keep track of the day's high, and low properly this method should be updated
            // Currently we only look at one 3 hour period making the highs and lows inaccurate

            forecast.push({
                code: response.list[i].weather[0].id,
                high: response.list[i].main.temp_max,
                low: response.list[i].main.temp_min
            });
        }


        return {
            channel: {
                atmosphere,
                wind,
                item: {
                    condition,
                    forecast
                }
            }
        }
    }

    function processAndUpdateForecastData(response, key, label) {
        var results = parseResponse(response);
        results.key = key;
        results.label = label;
        results.created = new Date().toISOString();
        app.updateForecastCard(results);
    }

    function getCachedUrl(url, key, label) {
        if ('caches' in window) {
            /*
             * Check if the service worker has already cached this city's weather
             * data. If the service worker has the data, then display the cached
             * data while the app fetches the latest data.
             */
            caches.match(url).then(function (response) {
                if (response) {
                    response.json().then(function updateFromCache(json) {
                        console.log('ServiceWorker Response', url);
                        console.log(new Date().toLocaleTimeString(), new Date().getMilliseconds());
                        processAndUpdateForecastData(json, key, label);
                    });
                }
            });
        }
    }

    /************************************************************************
     *
     * Code required to start the app
     *
     * NOTE: To simplify this codelab, we've used localStorage.
     *   localStorage is a synchronous API and has serious performance
     *   implications. It should not be used in production applications!
     *   Instead, check out IDB (https://www.npmjs.com/package/idb) or
     *   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
     ************************************************************************/

    app.selectedCities = localStorage.selectedCities;
    if (app.selectedCities) {
        app.selectedCities = JSON.parse(app.selectedCities);
        app.selectedCities.forEach(function (city) {
            app.getForecast(city.key, city.label);
        });
    } else {
        /* The user is using the app for the first time, or the user has not
         * saved any cities, so show the user some fake data. A real app in this
         * scenario could guess the user's location via IP lookup and then inject
         * that data into the page.
         */
        app.updateForecastCard(initialWeatherForecast);
        app.selectedCities = [
            {key: initialWeatherForecast.key, label: initialWeatherForecast.label}
        ];
        app.saveSelectedCities();
        app.selectedCities.forEach(function (city) {
            app.getForecast(city.key, city.label);
        });
    }

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('../service-worker.js')
            .then(function () {
                console.log('Service Worker Registered');
            });
    }
};
"use strict";

/**
* @this {ITPA.Core.StreetSmartList}
*/
ITPA.Core.StreetSmartList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, keyedList;
    var vacancyColors;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }

    this.GetVacancyColors = function () { return vacancyColors; }

    function getKeyFromItemData(itemData) { return core.GetKeyFromItemDataProperties(itemData, 'color_index'); }

    function needsUpdateItemData(updateObj) {
        var props = updateObj.itemData.properties;
        var newProps = updateObj.itemDataSet.properties;

        return true;
    }

    function filterAddItem(itemData) {
        return true;
    }

    function preProcessServiceData(data) {
        if (!!data) {
            if (tf.js.GetIsNonEmptyArray(data.blocks)) {
                var newData = [];
                var nMultiLines = 11, nColors = nMultiLines - 1;
                var multiLineCoords = new Array(nMultiLines);

                data = data.blocks;

                for (var i in data) {
                    var block = data[i];
                    var colorIndex = tf.js.NumberClip(tf.js.GetFloatNumber(block.realTimeProbability, 1), 0, 1);
                    var node1Coords = [block.node1.lng, block.node1.lat];
                    var node2Coords = [block.node2.lng, block.node2.lat];

                    colorIndex = Math.floor(colorIndex * nColors);

                    if (multiLineCoords[colorIndex] == undefined) { multiLineCoords[colorIndex] = []; }
                    multiLineCoords[colorIndex].push([node1Coords, node2Coords]);
                }

                for (var i = 0 ; i < nMultiLines ; ++i) {
                    var thisCoords = multiLineCoords[i];

                    if (thisCoords !== undefined) {
                        var properties = { realTimeProbability: i / 10, color_index: i, text: vacancyColors[i].text, color: vacancyColors[i].color, vacancyColors: vacancyColors };
                        var geometry = { type: "multilinestring", coordinates: thisCoords };
                        var itemData = { properties: properties, geometry: geometry, type: "Feature" };
                        newData.push(itemData);
                    }
                }
                data = newData;
            }
            else { data = undefined; }
        }
        return data;
    }

    function initialize() {
        core = settings.core;

        var streetSmartRoadGraphProbRestURL = 'http://streetsmartdemo.cloudapp.net/roadGraphProb?';
        //streetSmartSearchParkingRestURL: 'http://streetsmartdemo.cloudapp.net/searchParking?'

        var lat = tf.consts.defaultLatitude, lng = tf.consts.defaultLongitude;

        vacancyColors = [
                { index: 0, text: "1%", color: "#640f0f" }, { index: 1, text: "10%", color: "#8c0f0f" }, { index: 2, text: "20%", color: "#af1616" },
                { index: 3, text: "30%", color: "#ff3c1e" }, { index: 4, text: "40%", color: "#f06a1e" }, { index: 5, text: "50%", color: "#f5b91e" },
                { index: 6, text: "60%", color: "#f8e71c" }, { index: 7, text: "70%", color: "#b4d200" }, { index: 8, text: "80%", color: "#82ba00" },
                { index: 9, text: "90%", color: "#4a8e00" }, { index: 10, text: "99%", color: "#217a00" }
        ];

        streetSmartRoadGraphProbRestURL += 'userLat=' + lat + '&userLng=' + lng + '&showRealTime=true';

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            serviceURL: streetSmartRoadGraphProbRestURL,
            preProcessServiceData: preProcessServiceData,
            refreshCallback: settings.refreshCallback,
            keepNotUpdated: false,
            refreshMillis: 1000 * 30,
            keyedLists: [{
                name: settings.listName,
                getKeyFromItemData: getKeyFromItemData,
                needsUpdateItemData: needsUpdateItemData,
                filterAddItem: filterAddItem
            }]
        })).GetKeyedList(settings.listName);
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

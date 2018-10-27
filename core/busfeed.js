"use strict";

ITPA.Core.BusFeedList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, keyedList, serverURL;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }
    this.RefreshNow = function () { return keyedListsTimedRefresh.RefreshNow(); }

    function preProcessServiceData(data) {
        var newData = [];

        //console.log(JSON.stringify(data));
        //feedData":[ {"busId": 5011, "cameraType": 2} {"busId": 5011, "cameraType": 1} ]

        var fakeData = false;

        if (fakeData) {
            data = {
                names: [
                    "avocado__CATS1__",
                    "apple__SW6__",
                    "avocado__CATS11__",
                    "apple__SW61__",
                    "avocado__CATS12__",
                    "apple__SW62__",
                    "avocado__CATS13__",
                    "apple__SW63__",
                    "avocado__CATS14__",
                    "apple__SW64__"
                ],
                feedData: [{
                    busId: 5011,
                    cameraType: 1
                }, {
                    busId: 4061,
                    cameraType: 1
                }, {
                    busId: 5011,
                    cameraType: 1
                }, {
                    busId: 4061,
                    cameraType: 1
                }, {
                    busId: 5011,
                    cameraType: 1
                }, {
                    busId: 4061,
                    cameraType: 1
                }, {
                    busId: 5011,
                    cameraType: 1
                }, {
                    busId: 4061,
                    cameraType: 1
                }, {
                    busId: 5011,
                    cameraType: 1
                }, {
                    busId: 4061,
                    cameraType: 1
                }]
            };
        }

        if (!!data && tf.js.GetIsNonEmptyArray(data.names)) {
            //if (nRefresh++ < 5) { if (data.names.length > 1) { data.names = [data.names[1]]; if (data.feedData) { data.feedData = [data.feedData[1]]; } } }
            var names = data.names, feedData = data.feedData, len = names.length;
            for (var i = 0; i < len; ++i) {
                var feedName = names[i];
                var nameFields = feedName.split("__");
                if (nameFields.length == 3) {
                    var name = nameFields[1];
                    var fd = feedData ? feedData[i] : undefined;
                    if (fd === undefined) {
                        switch (name) {
                            case "SW-6":
                                fd = { busId: 4061, cameraType: 1 };
                                break;
                            case "SW6-InsideCam":
                                fd = { busId: 4061, cameraType: 2 };
                                break;
                            case "MPV-3":
                                fd = { busId: 5011, cameraType: 1 };
                                break;
                            case "MPV-3-InsideCam":
                                fd = { busId: 5011, cameraType: 2 };
                                break;
                            default:
                                fd = { busId: 999, cameraType: 1 };
                                break;
                        }
                    }
                    var itemData = {
                        properties: {
                            feedData: tf.js.ShallowMerge(fd),
                            name: name,
                            feedName: serverURL + ":8080/hls/" + feedName + ".m3u8"
                        }
                    };
                    newData.push(itemData);
                }
            }
        }

        return newData;
    };

    //var nRefresh = 1;

    function initialize() {
        core = settings.core;
        serverURL = core.GetMVideoServerURL();
        //serverURL = "http://131.94.133.214";  // hasn't been updated to new format
        //serverURL = "http://utma-video.cs.fiu.edu";
        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            serviceURL: function getServiceURL() { return serverURL + '/api/streams?v=' + new Date().getTime(); },
            preProcessServiceData: preProcessServiceData,
            refreshCallback: settings.refreshCallback,
            keepNotUpdated: false,
            //refreshMillis: 1000 * 10,
            refreshMillis: 1000 * 2,
            keyedLists: [{
                name: settings.listName,
                getKeyFromItemData: function getKeyFromItemData(itemData) { return core.GetKeyFromItemDataProperties(itemData, 'feedName'); },
                needsUpdateItemData: function needsUpdateItemData(updateObj) { return false; },
                filterAddItem: function filterAddItem(itemData) { return true; }
            }]
        })).GetKeyedList(settings.listName);
    };

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

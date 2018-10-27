"use strict";

tf.services.fl511 = function () {
    var theThis, header, header2, baseUrl;
    var tooltip_MessageSigns_Service,
        map_MapIcons_MessageSigns_Service,
        list_GetData_MessageSigns_Service;

    this.GetMessageBoards = function (then) { return getMessageBoards(then); }
    this.GetMessageSigns = function (then) { return getMessageSigns(then); }
    this.GetMessageToolTip = function (messageBoardId, then) { return getMessageToolTip(messageBoardId, then); }

    function getMessageBoards(then) {
        if (tf.js.GetFunctionOrNull(then)) {
            jsonRequest(map_MapIcons_MessageSigns_Service, false, function (notification) {
                then((tf.js.GetIsValidObject(notification) && (tf.js.GetIsArray(notification.data))) ? notification.data : undefined);
            }, undefined, null);
        }
    }

    function getMessageToolTip(messageBoardId, then) {
        if (tf.js.GetFunctionOrNull(then)) {
            jsonRequest(tooltip_MessageSigns_Service + messageBoardId, false,
                function (notification) {
                    then((tf.js.GetIsValidObject(notification) && (tf.js.GetIsValidObject(notification.data)) && (tf.js.GetIsNonEmptyString(notification.data.response))) ? notification.data.response : undefined);
            }, function (httpRequest) {
                var response =
                    tf.js.GetIsNonEmptyString(httpRequest.responseText) ? httpRequest.responseText :
                    (tf.js.GetIsNonEmptyString(httpRequest.response) ? httpRequest.response : "");
                return { response: response };
            });
        }
    }

    function jsonRequest(url, addMillis, then, jsonDecode, replaceHeader) {
        if (tf.js.GetFunctionOrNull(then)) {
            var urlUse = !!addMillis ? url + (new Date().getTime()) : url;
            new tf.ajax.JSONGet().Request(baseUrl + urlUse, function (notification) { then(notification); },
                undefined, undefined, true, undefined, jsonDecode, undefined, replaceHeader != undefined ? replaceHeader : header);
        }
    }

    function prepareHeader() {
        var requestVerificationToken = "VBm04UIBXRKJZMTwkKMrx1Z2-o5SRL8P5ezkfL9Q3e6rl2VuI5QnsmzH_2jLqh0A_ckIX0qssLADfXBZfOTNg8BJY5I1";
        var requestVerificationToken2 = "cFEFdYUD14ToZOyvqz-f-FSl7_OaFlOra0JkMyjucqCvKYyAEnZWcBplMnhD9Hzvqn3TioOufSJtESYxfrbhq4sXwDM1";
        //var cookie = "ASP.NET_SessionId=c5yrwrctibjsytg0koe1adj0; _culture=en-US; __RequestVerificationToken=Iml-6a29rMsoLTMh6-wYhdijd0G_BwyA1s-YUscUFGgntVMhzUTMd-Na0OdiSF6Bis21OeURKejEQ-OVM8beMkOVOTo1; _gat=1; map=%7B%22selectedLayers%22%3A%5B%22TrafficSpeeds%22%2C%22MessageSigns%22%5D%2C%22prevZoom%22%3A12%2C%22prevLatLng%22%3A%5B25.808854740308472%2C-80.26782978564454%5D%7D; _ga=GA1.2.765911993.1476705891; NSC_gm511.dpn-TTM=ffffffff09181f1a45525d5f4f58455e445a4a423660";
        header = { '__RequestVerificationToken': requestVerificationToken };
    }

    function initialize() {
        baseUrl = "https://fl511.com/";

        map_MapIcons_MessageSigns_Service = "map/mapIcons/MessageSigns";
        tooltip_MessageSigns_Service = "tooltip/MessageSigns/";
        list_GetData_MessageSigns_Service = "List/GetData/MessageSigns";

        prepareHeader();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

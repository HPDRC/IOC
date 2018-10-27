"use strict";

/**
* @this {ITPA.Core.ETAList}
*/
ITPA.Core.ETAList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, coreBusList, corePlatformList, nETAs, settingsRefreshCallback, refreshSecs;
    var allEventName = "all", eventDispatcher;
    var etasByStopId, etasByBusId, nStopEtas, nBusEtas;

    this.GetCore = function () { return core; }

    this.GetNETAs = function () { return nETAs; }
    this.GetNStopETAs = function () { return nStopEtas; }
    this.GetNBuspETAs = function () { return nBusEtas; }

    this.GetEtasForBusId = function (id) { return etasByBusId[id]; }
    this.GetEtasForStopId = function (id) { return etasByStopId[id]; }

    this.GetBusHasEtas = function (id) {
        var hasEtas = false;
        var etasForBus = theThis.GetEtasForBusId(id);
        if (etasForBus != undefined) { hasEtas = etasForBus.etas.length > 0; }
        return hasEtas;
    }

    this.GetStopHasEtas = function (id) {
        var hasEtas = false;
        var etasForStop = theThis.GetEtasForStopId(id);
        if (etasForStop != undefined) { hasEtas = etasForStop.etas.length > 0; }
        return hasEtas;
    }

    this.AddListener = function (callBack) { return eventDispatcher.AddListener(allEventName, callBack); }

    function notify(addObj) { eventDispatcher.Notify(allEventName, tf.js.ShallowMerge(addObj, { sender: theThis })); }

    function refreshCoreBusPlatformLists() {
        if (!coreBusList) { coreBusList = core.GetBusList(); }
        if (!corePlatformList) { corePlatformList = core.GetPlatformList(); }
        return !!coreBusList && !!corePlatformList;
    }

    function getKeyFromItemData(itemData) { return undefined; }
    function needsUpdateItemData(updateObj) { return false; }
    function filterAddItem(itemData) { return true; }

    function preProcessServiceData(data) {
        //console.log('got etas');
        //{ "eta":"2017-03-09 10:49:54.0","time_calculated":"2017-03-09 10:41:55.0","platform_id":3,"line_id":1,"public_transport_vehicle_id":4011155},

        var data = core.GetDataFromArray(data);

        //if (Math.random() < 0.25) { data = undefined; console.log('made empty data'); }

        nStopEtas = nBusEtas = nETAs = 0;
        var allNewEtas = [], allNewEtasByKey = {}, newEtasByStopId = {}, newEtasByBusId = {};

        if (!!data) {
            refreshCoreBusPlatformLists();
            var busKL = !!coreBusList ? coreBusList.GetKeyedList() : undefined, stopKL = !!corePlatformList ? corePlatformList.GetKeyedList() : undefined;
            if (!!busKL && !!stopKL) {
                for (var i in data) {
                    var d = data[i];
                    var eta = d.eta, vid = d.public_transport_vehicle_id, sid = d.platform_id;
                    var allKey = eta + '|' + vid + '|' + sid, busKey = '' + vid, stopKey = '' + sid;
                    var existingNewAll = allNewEtasByKey[allKey];
                    if (existingNewAll == undefined) {
                        var busItem = busKL.GetItem(vid);
                        var stopItem = stopKL.GetItem(sid);
                        if (!!busItem && !!stopItem) {
                            var etaObj = tf.js.GetDateFromTimeStamp(eta);
                            var newAllEta = { allKey: allKey, busKey: busKey, stopKey: stopKey, eta: eta, etaObj: etaObj, vid: vid, sid: sid, busItem: busItem, stopItem: stopItem };
                            allNewEtasByKey[allKey] = newAllEta;
                            allNewEtas.push(newAllEta);
                        }
                        //else { console.log('eta for unknown bus or stop'); }
                    }
                    //else { console.log('duplicate eta key: ' + allKey); }
                }

                allNewEtas.sort(function (a, b) { var ea = a.etaObj, eb = b.etaObj; return ea < eb ? -1 : (ea > eb ? 1 : 0); })

                nETAs = allNewEtas.length;

                for (var i = 0; i < nETAs ; ++i) {
                    var newAllEta = allNewEtas[i];
                    var vid = newAllEta.vid, sid = newAllEta.sid, busKey = newAllEta.busKey, stopKey = newAllEta.stopKey;

                    var existingBus = etasByBusId[busKey];
                    var isBusInOldList = !!existingBus;
                    if (isBusInOldList) { existingBus.isInNewList = true; }

                    var existingNewBus = newEtasByBusId[busKey];
                    if (!existingNewBus) { existingNewBus = newEtasByBusId[busKey] = { isStop: false, isBus: true, key: busKey, vid: vid, etas: [], isInOldList: isBusInOldList, isInNewList: false }; ++nBusEtas; }
                    existingNewBus.etas.push(newAllEta);

                    var existingStop = etasByStopId[stopKey];
                    var isStopInOldList = !!existingStop;
                    if (isStopInOldList) { existingStop.isInNewList = true; }

                    var existingNewStop = newEtasByStopId[stopKey];
                    if (!existingNewStop) { existingNewStop = newEtasByStopId[stopKey] = { isBus: false, isStop: true, key: stopKey, sid: sid, etas: [], isInOldList: isStopInOldList, isInNewList: false }; ++nStopEtas; }
                    existingNewStop.etas.push(newAllEta);
                }
            }
        }

        var addStopIds = [], addBusIds = [];
        var updateStopIds = [], updateBusIds = [];
        var delStopIds = [], delBusIds = [];

        for (var i in etasByBusId) { var item = etasByBusId[i]; if (!item.isInNewList) { delBusIds.push(item.vid); } }
        for (var i in etasByStopId) { var item = etasByStopId[i]; if (!item.isInNewList) { delStopIds.push(item.sid); } }

        for (var i in newEtasByBusId) {
            var item = newEtasByBusId[i], itemId = item.vid;
            if (item.isInOldList) { updateBusIds.push(itemId); } else { addBusIds.push(itemId); }
        }

        for (var i in newEtasByStopId) {
            var item = newEtasByStopId[i], itemId = item.sid;
            if (item.isInOldList) { updateStopIds.push(itemId); } else { addStopIds.push(itemId); }
        }

        etasByBusId = newEtasByBusId;
        etasByStopId = newEtasByStopId;

        /*console.log('netas: ' + nETAs +
            ' nadd bus: ' + addBusIds.length + ' nadd stop: ' + addStopIds.length +
            ' nupdate bus: ' + updateBusIds.length + ' nupdate stop: ' + updateStopIds.length +
            ' ndel bus: ' + delBusIds.length + ' ndel stop: ' + delStopIds.length);*/

        //console.log('etadebug preprocessed etas');

        notify({ addBusIds: addBusIds, addStopIds: addStopIds, updateBusIds: updateBusIds, updateStopIds: updateStopIds, delBusIds: delBusIds, delStopIds: delStopIds });

        return [];
    }

    function refreshCallback(theList) { if (!!settingsRefreshCallback) { settingsRefreshCallback(theThis); } }

    function initialize() {
        core = settings.core;
        settingsRefreshCallback = tf.js.GetFunctionOrNull(settings.refreshCallback);

        eventDispatcher = new tf.events.MultiEventNotifier({ eventNames: [allEventName] });

        etasByStopId = {};
        etasByBusId = {};

        nStopEtas = nBusEtas = nETAs = 0;

        refreshSecs = 15;

        keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            serviceURL: core.GetFullBusesEtasServiceName(),
            preProcessServiceData: preProcessServiceData,
            refreshCallback: refreshCallback,
            keepNotUpdated: false,
            refreshMillis: 1000 * refreshSecs,
            keyedLists: [{
                name: settings.listName,
                getKeyFromItemData: getKeyFromItemData,
                needsUpdateItemData: needsUpdateItemData,
                filterAddItem: filterAddItem
            }]
        });
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

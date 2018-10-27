"use strict";

/**
* @this {ITPA.Core.IncidentList}
*/
ITPA.Core.IncidentList = function (settings) {

    var theThis, core, keyedListsTimedRefresh, keyedList;

    this.GetCore = function () { return core; }
    this.GetKeyedList = function () { return keyedList; }

    function getKeyFromItemData(itemData) { return core.GetKeyFromItemDataProperties(itemData, 'event_id'); }

    function needsUpdateItemData(updateObj) {
        var props = updateObj.itemData.properties;
        var newProps = updateObj.itemDataSet.properties;

        var geomCoords = updateObj.itemData.geometry.coordinates;
        var newGeomCoords = updateObj.itemDataSet.geometry.coordinates;

        if (newGeomCoords[0] != geomCoords[0] || newGeomCoords[1] != geomCoords[1]) { return true; }

        return props.external_incident_type != newProps.external_incident_type ||
            props.remarks != newProps.remarks ||
            props.dispatch_time != newProps.dispatch_time ||
            props.arrival_time != newProps.arrival_time;
    }

    function filterAddItem(itemData) {
        /*var accept = core.IsPointFeatureInsideExtent(itemData);
        if (!accept) { core.Log('incident outside ITPA extent rejected "' + itemData.properties.event_id + '" ' + itemData.properties.external_incident_type); }
        return accept;*/
        return true;
    }

    function initialize() {
        core = settings.core;

        keyedList = (keyedListsTimedRefresh = new tf.js.KeyedListsPeriodicRefresh({
            onCreated: settings.onCreated,
            serviceURL: core.GetFullIncidentsServiceName(),
            preProcessServiceData: core.GetFeatureListFromData,
            refreshCallback: settings.refreshCallback,
            keepNotUpdated: false,
            refreshMillis: 1000 * 40,
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

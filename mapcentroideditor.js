"use strict";

ITPA.OC.GarageCentroidEditor = function (settings) {

    var theThis, styles, oc, occList, mapEventHandler, tables, map, occLayer, isShowing, notifyCB;
    var statusButtonEnabledClasses, statusButtonDisabledClasses;
    var controlWrapper, saveButton, identBtn, editCentroidInstructionsDivE;
    var garageEditing, occEditing;
    var centroidFeature;
    var data, props, geom;
    var centroidIsMoving;
    var centroidSaved;

    this.GetWrapperDiv = function () { return controlWrapper; }

    this.Edit = function (garageItem) { return edit(garageItem); }

    this.Close = function (confirmedBool) { return !!confirmedBool ? theThis.Confirm() : theThis.Cancel(); }

    this.Confirm = function () { return confirm(); }
    this.Cancel = function () { return cancel(); }

    function checkState() {
        saveButton.GetHTMLElement().style.display = !centroidIsMoving ? 'inline-block' : 'none';
        editCentroidInstructionsDivE.innerHTML = !centroidIsMoving ? 'Click Centroid to start moving it' : 'Click Map to position Centroid';
    }

    function notify(isConfirmed) {
        if (!!garageEditing) {
            var geSaved = garageEditing;
            if (!isConfirmed) { updateCentroidCoords(centroidSaved); }
            garageEditing = occEditing = undefined;
            if (mapEventHandler.GetMouseMoveClickHandler() == mouseMoveClickHandler) { mapEventHandler.SetMouseMoveClickHandler(undefined); }
            occLayer.DelMapFeature(centroidFeature);

            if (!!notifyCB) { notifyCB({ sender: theThis, isConfirmed: isConfirmed, garageEditing: geSaved }); }
        }
    }

    function cancel() { return notify(false); }
    function confirm() { return notify(true); }

    function mouseMoveClickHandler(notification) {
        if (notification.isActive) {
            var mapNotification = notification.mapNotification;
            if (!!mapNotification) {
                var eventCoords = mapNotification.eventCoords;
                if (!!eventCoords) {
                    var isClick, isFeature;

                    switch (mapNotification.eventName) {
                        case tf.consts.mapClickEvent:
                            isClick = true;
                            break;
                        case tf.consts.mapFeatureClickEvent:
                            isClick = true;
                            isFeature = true;
                            break;
                    }
                    if (centroidIsMoving || isClick) {
                        centroidFeature.SetPointCoords(eventCoords);
                        updateCentroidCoordsFromFeature();
                    }
                    if (isClick) {
                        if (centroidIsMoving) { centroidIsMoving = false; }
                        else { centroidIsMoving = isFeature && mapNotification.mapFeature == centroidFeature; }
                        checkState();
                    }
                }
            }
        }
        else { notify(notification.isConfirmed); }
    }

    function updateCentroidCoords(pointCoords) {
        if (!!garageEditing) {
            props.centroid = pointCoords;
            garageEditing.NotifyUpdated();
            if (!!occEditing) {
                occEditing.GetData().geometry.coordinates = pointCoords;
                occEditing.NotifyUpdated();
            }
        }
    }

    function updateCentroidCoordsFromFeature() { updateCentroidCoords(centroidFeature.GetPointCoords()); }

    function edit(garageItem) {
        if (garageItem == garageEditing) { return; }
        cancel();
        if (!!garageItem) {

            garageEditing = garageItem;
            data = garageEditing.GetData();
            props = data.properties;
            geom = data.geometry;
            identBtn.SetText(props.identifier);
            mapEventHandler.SetMouseMoveClickHandler(mouseMoveClickHandler);
            centroidSaved = props.centroid;

            var hasCentroid = centroidSaved != undefined;

            centroidIsMoving = !hasCentroid;
            if (hasCentroid) { map.SetCenter(centroidSaved); }
            centroidFeature.SetPointCoords(map.GetCenter());
            occEditing = occList.GetItem(garageEditing.GetKey());
            updateCentroidCoordsFromFeature();
            occLayer.AddMapFeature(centroidFeature);
            checkState();
        }
    }

    function getOnStopCentroidEdit(confirmed) { return function (notification) { return confirmed ? confirm() : cancel(); } }

    function createControl() {
        var buttonDim = "18px", textDim = buttonDim;

        controlWrapper = new tf.dom.Div({ cssClass: "editCentroidWrapper" });

        var editCentroidTitleDiv = new tf.dom.Div({ cssClass: "editCentroidTitleDiv" });
        var editCentroidTitleDivE = editCentroidTitleDiv.GetHTMLElement();

        editCentroidTitleDivE.innerHTML = 'Parking Site Centroid';

        var editCentroidIdentDiv = new tf.dom.Div({ cssClass: "editCentroidIdentDiv" });

        identBtn = styles.AddButtonDivMargins(new tf.ui.TextBtn({
            dim: buttonDim, style: true, label: '', tooltip: "Show on list", onClick: function () { tables.GoTo(garageEditing); }
        }));

        editCentroidIdentDiv.AddContent(identBtn);

        var editCentroidInstructionsDiv = new tf.dom.Div({ cssClass: "editCentroidInstructionsDiv" });
        editCentroidInstructionsDivE = editCentroidInstructionsDiv.GetHTMLElement();

        var editCentroidButtonsDiv = new tf.dom.Div({ cssClass: "editCentroidButtonsDiv" });

        saveButton = styles.AddButtonDivMargins(new tf.ui.TextBtn({
            dim: textDim, style: statusButtonEnabledClasses, label: 'Save', tooltip: "Save Centroid", onClick: getOnStopCentroidEdit(true)
        }));

        var cancelButton = styles.AddButtonDivMargins(new tf.ui.TextBtn({
            dim: textDim, style: statusButtonDisabledClasses, label: 'Cancel', tooltip: "Cancel", onClick: getOnStopCentroidEdit(false)
        }));

        tf.dom.AddCSSClass(saveButton, "textShadowBlack");
        tf.dom.AddCSSClass(cancelButton, "textShadowBlack");

        editCentroidButtonsDiv.AddContent(saveButton, cancelButton);

        controlWrapper.AddContent(editCentroidTitleDiv, editCentroidIdentDiv, editCentroidInstructionsDiv, editCentroidButtonsDiv)
    }

    function createFeature() {
        centroidFeature = new tf.map.Feature({
            type: 'point', coordinates: [0, 0],
            style: { icon: true, icon_url: './images/track2.svg', scale: 0.1, zindex: 10 }
            //style: { marker: true, label: 'c', marker_verpos: 'center', marker_horpos: 'center', zindex: 10 }
        });
    }

    function initialize() {
        styles = tf.GetStyles();
        statusButtonEnabledClasses = styles.CreateTextDivBtnClasses("white", "green", "white", "darkgreen");
        statusButtonDisabledClasses = styles.CreateTextDivBtnClasses("white", "red", "white", "darkred");
        tables = settings.tables;
        notifyCB = tf.js.GetFunctionOrNull(settings.onNotify);
        oc = tables.GetOC();
        mapEventHandler = oc.GetMapEventHandler();
        map = tables.GetMap();
        occList = oc.GetCore().GetOccupancyList();
        if (!!occList) { occList = occList.GetKeyedList(); }
        occLayer = oc.GetMaps().GetLargeMapLayer(ITPA.Core.OccupancyListName);
        createControl();
        createFeature();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

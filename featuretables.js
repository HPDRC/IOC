"use strict";

ITPA.OC.ButtonClassSrc = {
    "json-button": './images/json.svg',
    "lines-button": './images/road.svg',
    "upload-button": './images/upload.svg',
    "download-button": './images/download.svg',
    "download2-button": './images/download2.svg',
    "refresh-button": './images/refresh.svg',
    "device-button": './images/device.svg',
    "user-button": './images/user.svg',
    "stop-button": './images/stop.svg',
    "parking-button": './images/parking.svg',
    "bus-button": './images/bus.svg',
    "inc-button": './images/incident.svg',
    "msg-button": './images/msgbd.svg',
    "notification-button": './images/envelope.svg',
    "polygon-button": './images/polygon.svg',
    "plus-button": './images/plus.svg',
    "eta-button": './images/recentBlue.svg',
    "track-button": './images/track.svg',
    "pencil-button": './images/pencil.svg',
    "video-button": './images/video.svg',
    "label-button": './images/label.svg',
    "nolabels-button": './images/nolabels.svg',
    "history-button": './images/history.svg'
};

ITPA.OC.FeatureTables = function (settings) {
    var theThis, appStyles, styles, oc, core, mapEventHandler, linesList, linesKeyedList, coreFeatureLists, appLayout, listLayoutToolbarTab, curListName, maps, map, lineDirections;
    var toolBars, toolbarWrapper, listLayoutDiv, listLayoutDivE, listLayoutDivES, lists, buttons, buttonsWrappers, lastButton, lastButtonWrapper, lastList, etaList, canAdmin;
    var notificationEditor, routeStopsEditor;
    var viewBusETAsButton, viewBusETAsButtonWrapperES;
    var viewStopETAsButton, viewStopETAsButtonWrapperES;
    var labelBusButton, labelBusButtonWrapperES;
    var busHistory, deviceHistory;
    var labelDeviceButton, labelDeviceButtonWrapperES;
    var labelStopButton, labelStopButtonWrapperES;
    var noLabelStopButton, noLabelStopButtonWrapperES;
    var largeMapFeatureStyleName;
    var tableFooterDivE;
    var inPlaceTextAreaSingleLine;
    var garageList, occupancyList, occupancyKeyedList;
    var polyCode;
    var toaster, confirmMsg;
    var typeBeingEdited, valueBeingEdited, listNameBeingEdited, keyedItemBeingEdited, elementBeingEdited, attrBeingEdited;
    var statusButtonEnabledClasses, statusButtonDisabledClasses;
    var statusButtonSelectedClasses, statusButtonUnSelectedClasses;
    var mapEditingControl, curMapEditor;
    var garageCentroidEditor, garageShapeEditor;
    var garageAddedId;
    var curFloatEditor;
    var tableSettings, tableRowStyle, tableRowHoverStyle;
    var busList, busKeyedList;
    var fiuFleetOrder, mdtFleetOrder;
    var extLineLoader, extLineShapeLoader, extLineLoadersStartedRefresh;
    var newFIULines, modifiedLines, modifiedLinesIds, updateAttributeFIULines, shapeChangedLines, shapeEditedLines;
    var lineAttributesOngoingStr;
    var linesUpdateButton, isSubmittingLinesUpdate;
    var colorLineAttrBkNormal, colorLineAttrBkCurrent;
    var routeShapeEditor;
    var fullScreenBusLineJSON;

    this.GetOC = function () { return oc; }
    this.GetMap = function () { return map; }
    this.UpdateTableFooter = function (listName) { return updateTableFooter(lisName); }
    this.GoTo = function (keyedItem) { return goTo(keyedItem); }
    this.SetList = function (listName) { return setList(listName); }

    this.OnBusETAItemsUpdated = function (notification) { return onBusETAItemsUpdated(notification); }

    function setCurMapEditor(newMapEditor, itemToEdit) {
        var hasNewEditor = !!newMapEditor;
        if (!!curMapEditor) { curMapEditor.Cancel(); mapEditingControl.ClearContent(); }
        curMapEditor = newMapEditor;
        if (hasNewEditor) {
            mapEventHandler.StopAutoCycle();
            curMapEditor.Edit(itemToEdit);
            mapEditingControl.AddContent(curMapEditor.GetWrapperDiv());
        }
        map.ShowPanel(tf.consts.panelNameLayers, !hasNewEditor);
        showControl(mapEditingControl, hasNewEditor);
    }

    function setGarageOccupancyLayersVisible(visibleBool) {
        maps.SetLargeMapLayerVisible(ITPA.Core.GarageListName, visibleBool);
        maps.SetLargeMapLayerVisible(ITPA.Core.OccupancyListName, visibleBool);
    }

    function toastUpdate(successBool, verb) {
        var message;
        
        if (tf.js.GetIsNonEmptyString(verb)) {
            message = successBool ? verb + " Successful" : "Failed to " + verb;
        }
        else {
            message = successBool ? "Update Successful" : "Failed to Update";
        }
        toaster.Toast({ text: message });
    }

    function onStartEditingGarage(selGarage, editor) {
        if (!!selGarage && !!editor) {
            setGarageOccupancyLayersVisible(true);
            setCurMapEditor(editor, selGarage);
            appLayout.SetGarageCheck(false);
        }
    }

    function onStartEditingSelGarage(editor) { return onStartEditingGarage(getSelKeyedItem(ITPA.Core.GarageListName), editor); }

    function onEditGarageCentroid() { return onStartEditingSelGarage(garageCentroidEditor); }

    function onEditGarageShape() { return onStartEditingSelGarage(garageShapeEditor); }

    function onMapEditorNotify(notification) {
        var isGarageEditor = notification.sender == garageCentroidEditor || notification.sender == garageShapeEditor;
        if (notification.isConfirmed) {
            if (isGarageEditor) { updateGarageRecord(notification.garageEditing); }
        }
        if (isGarageEditor) { appLayout.SetGarageCheck(true); }
        setCurMapEditor(undefined);
    }

    function onBusETAItemsUpdated(notification) {
        if (!!busKeyedList) {
            for (var i in notification.keys) {
                updateBusETAs(busKeyedList.GetItem(notification.keys[i]));
            }
        }
    }

    function updateTableFooter(desiredListName) {
        if (desiredListName == undefined || desiredListName == curListName) {
            var list = lists[curListName];
            if (!!list) {
                var keyedList = list.GetKeyedList();
                var count = keyedList.GetItemCount();
                var innerHTML = '' + count + ' ' + (count == 1 ? 'item' : 'items');
                tableFooterDivE.innerHTML = innerHTML;
            }
        }
    }

    function setList(listName) {
        if (curListName != listName) {
            var list = lists[listName];
            if (!!list) {
                toolbarWrapper.ClearContent();
                if (!!toolBars[listName]) { toolbarWrapper.AddContent(toolBars[listName].toolBar); }
                if (!!lastList) { if (lastList != list) { lastList.Show(false); list.Show(true); } } else { list.Show(true); }
                lastList = list;
                //if (!!lastButton) { lastButton.style.backgroundColor = "white"; }
                if (!!lastButtonWrapper) {
                    tf.dom.RemoveCSSClass(lastButtonWrapper, "listButtonWrapperBorderSelected");
                    //lastButtonWrapper.GetHTMLElement().style.border = "2px solid transparent";
                }
                lastButton = buttons[listName];
                lastButtonWrapper = buttonsWrappers[listName];
                //lastButton.style.backgroundColor = "rgba(153,122,0, 0.4)";
                //lastButtonWrapper.GetHTMLElement().style.border = "2px solid navy";
                //listLayoutDiv.ReplaceContent(list.GetTableParent());
                tf.dom.AddCSSClass(lastButtonWrapper, "listButtonWrapperBorderSelected");
                curListName = listName;
                updateTableFooter();
                setTimeout(appLayout.ResizeListLayout, 100);
            }
        }
    }

    function goTo(keyedItem) {
        if (!!keyedItem) {
            var keyedList = keyedItem.GetList();
            var listName = keyedList.GetName();
            var list = lists[listName];

            if (!!list) {
                var isCurList = curListName == listName;
                setList(listName);
                if (listName == ITPA.Core.BusListName) {
                    var busBeingTracked = mapEventHandler.GetTrackBusKeyedItem();
                    if (!!busBeingTracked && busBeingTracked != keyedItem) {
                        mapEventHandler.SetTrackBusKeyedItem(keyedItem);
                    }
                }
                if (isCurList) { list.GoTo(keyedItem); }
                else { setTimeout(function () { list.GoTo(keyedItem) }, 250); }
            }
        }
    }

    function selectFirstRowIfNoneSelected(listName, bypassNotification) {
        var list = lists[listName];
        if (!!list) {
            var kt = list.GetTable(), table = kt.GetTable();
            if (table.GetRowCount() > 0 && !table.GetSelectedRow()) {
                table.SelectRow(table.GetRow(0), true, bypassNotification);
            }
        }
    }

    function getOnTableChanged(listName) {
        return function (notification) {
            if (listName == ITPA.Core.GarageListName) {
                if (garageAddedId != undefined) {
                    var gai = garageAddedId;
                    garageAddedId = undefined;
                    var addedGarage = garageList.GetKeyedList().GetItem(gai);
                    if (!!addedGarage) { goTo(addedGarage); }
                }
            }
            /*else if (listName == ITPA.Core.RouteListName) {

            }*/
            updateTableFooter(listName);
            return selectFirstRowIfNoneSelected(listName, false);
        }
    }

    function getOnSelectTableRow(listName) {
        return function (notification) {
            if (!!toolBars[listName] && !!toolBars[listName].onTableRowSelect) { toolBars[listName].onTableRowSelect(notification); }
            if (notification.isClick) {
                if (!!notification.selected) {
                    var keyedItem = notification.selected.GetKeyedItem();
                    var itemKey = keyedItem.GetKey();
                    var keyedFeature = oc.GetKeyedFeatureFromKeyedItem(keyedItem);
                    if (!!keyedFeature) {
                        mapEventHandler.StopAutoCycle();
                        var checkUpdateETAs;
                        var isBus = false;
                        switch (listName) {
                            case ITPA.Core.BusListName:
                                var busBeingTracked = mapEventHandler.GetTrackBusKeyedItem();
                                if (!!busBeingTracked) {
                                    if (keyedItem != busBeingTracked) { busBeingTracked = keyedItem; }
                                    else { busBeingTracked = undefined; }
                                    mapEventHandler.SetTrackBusKeyedItem(busBeingTracked);
                                }
                                checkUpdateETAs = mapEventHandler.GetETAItemIsBus();
                                isBus = true;
                                break;
                            case ITPA.Core.PlatformListName:
                                checkUpdateETAs = !mapEventHandler.GetETAItemIsBus();
                                isBus = false;
                                break;
                        }
                        if (checkUpdateETAs) {
                            var etaItem = mapEventHandler.GetETAKeyedItem();
                            if (!!etaItem) {
                                if (keyedItem != etaItem) { etaItem = keyedItem; } else { etaItem = undefined; }
                                mapEventHandler.SetETAKeyedItem(etaItem, isBus);
                            }
                        }
                        if (keyedFeature.GetIsPoint()) {
                            map.SetCenter(keyedFeature.GetPointCoords());
                        }
                        else {
                            var extent = keyedFeature.GetExtent();
                            extent = tf.js.ScaleMapExtent(extent, 1.4);
                            map.SetVisibleExtent(extent);
                        }
                        switch (listName) {
                            case ITPA.Core.BusListName:
                            case ITPA.Core.PlatformListName:
                            case ITPA.Core.DeviceListName:
                                keyedFeature.SetIsAlwaysInHover(!keyedFeature.GetMapFeature().GetIsAlwaysInHover());
                                break;
                            case ITPA.Core.MessageListName:
                                if (keyedItem != mapEventHandler.GetToastedItem()) {
                                    setTimeout(function () { mapEventHandler.ToastMessage(keyedItem); }, 500);
                                }
                                else { mapEventHandler.CloseToast(); }
                                break;
                            case ITPA.Core.IncidentListName:
                                if (keyedItem != mapEventHandler.GetToastedItem()) {
                                    setTimeout(function () { mapEventHandler.ToastIncident(keyedItem); }, 500);
                                } else { mapEventHandler.CloseToast(); }
                                break;
                        }
                    }
                }
            }
        }
    }

    function createContentContainer() {
        var contentContainer = new tf.dom.Div();
        var contentContainerStyle = contentContainer.GetHTMLElement().style;

        contentContainerStyle.textAlign = 'left';
        //contentContainerStyle.width = "100%";
        contentContainerStyle.border = "2px solid navy";
        contentContainerStyle.borderRadius = "4px";
        contentContainerStyle.overflow = "hidden";
        return contentContainer;
    }

    function getUserRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var props = data;

            if ((content = keyedItem.listContent) == undefined) {
                content = createContentContainer();

                var divWrapper = new tf.dom.Div({ cssClass: "userWrapperDiv" });
                var divEmail = new tf.dom.Div({ cssClass: "userEmailDiv" });
                var divEmailE = divEmail.GetHTMLElement();
                var divEmailConfirmed = new tf.dom.Div({ cssClass: "userEmailConfirmedDiv" });
                var divEmailConfirmedE = divEmailConfirmed.GetHTMLElement();

                divWrapper.AddContent(divEmail, divEmailConfirmed);
                content.AddContent(divWrapper);

                divEmailE.title = 'Email Address';

                keyedItem.listContent = content;
                keyedItem.divEmailE = divEmailE;
                keyedItem.divEmailConfirmedE = divEmailConfirmedE;
            }

            keyedItem.divEmailE.innerHTML = keyedItem.email = props.email;
            keyedItem.ec = props.email_confirmed ? 0 : 1;
            keyedItem.divEmailConfirmedE.innerHTML = (props.email_confirmed ? "Y" : "N");

            var confirmedTitle = 'Email address';
            
            if (!props.email_confirmed) { confirmedTitle += ' NOT'; }
            
            confirmedTitle += ' confirmed (' + props.last_email_code_str + ')';

            keyedItem.divEmailConfirmedE.title = confirmedTitle;
        }
        return { sender: theThis, content: content };
    }

    function getDeviceRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var props = data.properties;

            if ((content = keyedItem.listContent) == undefined) {
                content = createContentContainer();

                var divDeviceWrapper = new tf.dom.Div({ cssClass: "deviceWrapperDiv" });
                var divDeviceWrapperE = divDeviceWrapper.GetHTMLElement();
                var divDeviceId = new tf.dom.Div({ cssClass: "deviceIdDiv" });
                var divDeviceIdE = divDeviceId.GetHTMLElement();
                var divDeviceLastDate = new tf.dom.Div({ cssClass: "deviceLastDate" });
                var divDeviceLastDateE = divDeviceLastDate.GetHTMLElement();

                divDeviceWrapper.AddContent(divDeviceId, divDeviceLastDate);
                content.AddContent(divDeviceWrapper);

                divDeviceIdE.title = 'Device ID';
                divDeviceLastDateE.title = 'Last Activity';

                //last_altitude
                //last_heading
                //last_position_on
                //last_speed

                keyedItem.listContent = content;
                keyedItem.divDeviceIdE = divDeviceIdE;
                keyedItem.divDeviceLastDateE = divDeviceLastDateE;
            }

            keyedItem.lastPositionOnDate = props.last_position_on_date;
            keyedItem.divDeviceIdE.innerHTML = props.device_id;
            keyedItem.divDeviceLastDateE.innerHTML = props.last_position_on;
            //keyedItem.divDeviceLastDateE.innerHTML = props.last_position_on_date.toString();
        }
        return { sender: theThis, content: content };
    }

    function getStopRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var props = data.properties;
            var geom = data.geometry, coords = !!geom ? geom.coordinates : ['?', '?'];

            if ((content = keyedItem.listContent) == undefined) {
                content = createContentContainer();

                var divStopWrapper = new tf.dom.Div({ cssClass: "stopsDivWrapper" });
                var divStopFleet = new tf.dom.Div({ cssClass: "stopsDivFleet" });
                var divStopNumber = new tf.dom.Div({ cssClass: "stopsDivNumber" });
                var divStopAddress = new tf.dom.Div({ cssClass: "stopsDivAddress" });

                var divStopFleetE = divStopFleet.GetHTMLElement();
                var divStopNumberE = divStopNumber.GetHTMLElement();
                var divStopAddressE = divStopAddress.GetHTMLElement();

                divStopWrapper.AddContent(divStopFleet, divStopNumber, divStopAddress);
                content.AddContent(divStopWrapper);

                keyedItem.listContent = content;
                keyedItem.divStopFleetE = divStopFleetE;
                keyedItem.divStopNumberE = divStopNumberE;
                keyedItem.divStopAddressE = divStopAddressE;
            }

            keyedItem.divStopFleetE.innerHTML = props.fleet.toUpperCase();
            keyedItem.divStopFleetE.title = 'Fleet';

            keyedItem.divStopNumberE.innerHTML = props.fleet_id + '';
            keyedItem.divStopNumberE.title = 'lat: ' + coords[1] + ' lng: ' + coords[0];

            keyedItem.divStopAddressE.innerHTML = props.identifier.toLowerCase();
            keyedItem.divStopAddressE.title = props.identifier.toUpperCase();
        }
        return { sender: theThis, content: content };
    }

    function makeGarageUpdateRecord(keyedItem) {
        var data = keyedItem.GetData();
        var props = data.properties;
        var geom = data.geometry;
        var encoded_polyline;
        var centroid;

        if (!!geom.coordinates && geom.coordinates.length > 0) { encoded_polyline = polyCode.EncodeLineString(polyCode.Flipped(geom.coordinates[0]), 5); }
        if (!!props.centroid) { centroid = { lat: props.centroid[1], lng: props.centroid[0] }; }

        return {
            parking_site_id: props.parking_site_id,
            parking_site_type_id: props.parking_site_type_id,
            identifier: props.identifier,
            total_level: props.total_level,
            capacity: props.capacity,
            centroid: centroid,
            is_active: props.is_active,
            encoded_polyline: encoded_polyline
        };
    }

    function stopGarageEditors() { if (curMapEditor == garageCentroidEditor || curMapEditor == garageShapeEditor) { setCurMapEditor(undefined); } }

    function doAddNewGarage() {
        stopGarageEditors();
        garageList.Add({
            parking_site_id: 0,
            parking_site_type_id: 0,
            identifier: "New Parking Site",
            total_level: 0,
            capacity: 0,
            centroid: undefined,
            is_active: false,
            encoded_polyline: undefined
        }, function (data) {
            var success = !!data && !!data.status;
            toastUpdate(success, "Add Parking Site");
            if (success) { garageAddedId = data.id; }
            onRefreshGarageList();
        });
    }

    function onAddNewGarage() {
        confirmMsg.ConfirmMsg(function (notification) {
            if (!!notification && notification.confirmed) { doAddNewGarage(); }
            else {
                //console.log('cancelled');
            }
        }, "Added Parking Sites <b>cannot be deleted</b>.<br />Add new parking site?");
    }

    function updateGarageRecord(keyedItem) {
        var updateRecord = makeGarageUpdateRecord(keyedItem);
        garageAddedId = undefined;
        garageList.Add(updateRecord, function (data) {
            var success = !!data && !!data.status;
            toastUpdate(success);
            onRefreshGarageList();
        });
    }

    function onInPlaceEditClose(notification) {
        if (keyedItemBeingEdited != undefined) {
            var props = keyedItemBeingEdited.GetData().properties;
            var newText = tf.js.GetIsNonEmptyString(notification.text) ? notification.text : undefined;
            
            if (newText != valueBeingEdited) {
                var newValue;

                switch (typeBeingEdited) {
                    case 'i':
                        newValue = tf.js.GetNonNegativeIntFrom(newText, 0);
                        break;
                    case 's':
                    default:
                        newValue = newText;
                        break;
                }

                props[attrBeingEdited] = newValue;

                keyedItemBeingEdited.NotifyUpdated();

                switch (listNameBeingEdited) {
                    case ITPA.Core.GarageListName:
                        updateGarageRecord(keyedItemBeingEdited);
                        break;
                    default:
                        break;
                }
            }

            listNameBeingEdited = undefined;
            keyedItemBeingEdited = undefined;
            elementBeingEdited = undefined;
            attrBeingEdited = undefined;
        }
    }

    function getInPlaceEdit(typeName, listName, keyedItem, element, className, attrName) {
        return function () {
            //datePicker.Detach();

            if (keyedItemBeingEdited == keyedItem && elementBeingEdited == element) {
                inPlaceTextAreaSingleLine.Detach();
                return;
            }

            if (keyedItemBeingEdited != keyedItem || elementBeingEdited != element) {
                inPlaceTextAreaSingleLine.Detach();
            }

            if (keyedItemBeingEdited == undefined) {
                var props = keyedItem.GetData().properties;

                typeBeingEdited = typeName;
                listNameBeingEdited = listName;
                keyedItemBeingEdited = keyedItem;
                elementBeingEdited = element;

                valueBeingEdited = props[attrBeingEdited = attrName];

                switch (typeBeingEdited) {
                    case 'i':
                        valueBeingEdited = '' + valueBeingEdited;
                        break;
                    case 's':
                    default:
                        valueBeingEdited = valueBeingEdited.trim();
                        break;
                }

                inPlaceTextAreaSingleLine.SetText(valueBeingEdited);
                inPlaceTextAreaSingleLine.Attach(element, className);
            }
        }
    }

    function createEditRow(editClassName, nonEditClassName, contentTooltip, typeName, listName, keyedItem, attributeName) {
        var divRowWrapper = new tf.dom.Div({ cssClass: "editRowWrapper" });
        var className = canAdmin ? editClassName : nonEditClassName;
        var divContent = new tf.dom.Div({ cssClass: className });
        var divContentE = divContent.GetHTMLElement();

        divContentE.title = contentTooltip;

        if (canAdmin) {
            var editButton = makeToolBarButton("pencil-button", getInPlaceEdit(typeName, listName, keyedItem, divContentE, editClassName, attributeName), "Edit " + contentTooltip, "0px", true);
            tf.dom.AddCSSClass(editButton.wrapper, "tableButtonWrapper");
            tf.dom.AddCSSClass(editButton.button, "tableButton");
            divRowWrapper.AddContent(editButton.wrapper);
        }
        divRowWrapper.AddContent(divContent);
        return { wrapper: divRowWrapper, content: divContent, contentE: divContentE } ;
    }

    function getOnStatusClicked(keyedItem) {
        return function () {
            var props = keyedItem.GetData().properties;
            props.is_active = !props.is_active;
            keyedItem.NotifyUpdated();
            updateGarageRecord(keyedItem);
            return false;
        }
    }

    function getOnParkingTypeClicked(keyedItem, typeId) {
        return function () {
            var props = keyedItem.GetData().properties;
            if (props.parking_site_type_id != typeId) {
                props.parking_site_type_id = typeId;
                keyedItem.NotifyUpdated();
                updateGarageRecord(keyedItem);
            }
            return false;
        }
    }

    /*function getOnShapeEdit(keyedItem) {
        return function () {
            var props = keyedItem.GetData().properties;
            console.log('editing shape for line: ' + props.identifier);
            return false;
        }
    }*/

    function getRouteRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var props = data.properties;

            // class_id, icon, notification_id, url

            if ((content = keyedItem.listContent) == undefined) {
                content = createContentContainer();

                var divAllWrapper = new tf.dom.Div({ cssClass: "busAllWrapper" })

                var divLineWrapper = new tf.dom.Div({ cssClass: "busLineDivWrapper" });
                var divLineFleet = new tf.dom.Div({ cssClass: "busLineDivFleet" });
                var divLineNumber = new tf.dom.Div({ cssClass: "busLineDivNumber" });
                var divLineDirection = new tf.dom.Div({ cssClass: "busLineDivDirection" });

                var divLineWrapperE = divLineWrapper.GetHTMLElement();
                var divLineFleetE = divLineFleet.GetHTMLElement();
                var divLineNumberE = divLineNumber.GetHTMLElement();
                var divLineDirectionE = divLineDirection.GetHTMLElement();

                divLineFleetE.title = "Fleet";
                divLineNumberE.title = "Line number"
                divLineDirectionE.title = "Line direction";

                var divNStops = new tf.dom.Div({ cssClass: "linesDivNStops" });
                var divNStopsE = divNStops.GetHTMLElement();

                divNStopsE.title = "Number of bus stops";

                var routeTitleDivClassName = canAdmin ? "linesTitleDiv" : "linesTitleDivWithoutRatio";

                var routeTitleDiv = new tf.dom.Div({ cssClass: routeTitleDivClassName });
                var routeTitleDivE = routeTitleDiv.GetHTMLElement();

                divLineWrapper.AddContent(divLineFleet, divLineNumber, divLineDirection, divNStops);

                var divSmallShapeRatioE;

                if (canAdmin) {
                    var divSmallShapeRatio = new tf.dom.Div({ cssClass: "divSmallShapeRatio" });
                    divSmallShapeRatioE = divSmallShapeRatio.GetHTMLElement();

                    divSmallShapeRatioE.title = "Shape size ratio Custom : Normal";
                    divLineWrapper.AddContent(divSmallShapeRatio);
                }


                divAllWrapper.AddContent(divLineWrapper, routeTitleDiv);

                var divLinesMsgE, divLinesAttrMsgE, divLinesShapeMsgE;

                if (canAdmin) {
                    var divLinesMsg = new tf.dom.Div({ cssClass: "linesMsgDiv" });
                    var divLinesAttrMsg = new tf.dom.Div({ cssClass: "linesMsgSubDiv" });
                    var divLinesShapeMsg = new tf.dom.Div({ cssClass: "linesMsgSubDiv" });

                    divLinesMsgE = divLinesMsg.GetHTMLElement();
                    divLinesMsgE.title = 'Data Consistency Results';

                    divLinesAttrMsgE = divLinesAttrMsg.GetHTMLElement();
                    divLinesShapeMsgE = divLinesShapeMsg.GetHTMLElement();
                    
                    divLinesMsg.AddContent(divLinesAttrMsg, divLinesShapeMsg);
                    divAllWrapper.AddContent(divLinesMsg);
                }

                content.AddContent(divAllWrapper);

                keyedItem.listContent = content;

                /*var textDim = "16px";

                var editShapeButton = styles.AddButtonDivTopBottMargins(new tf.ui.TextBtn({
                    dim: textDim, style: true, label: '', tooltip: 'Open Bus Line Shape Editor', onClick: getOnShapeEdit(keyedItem)
                }));

                keyedItem.editShapeButton = editShapeButton;*/

                keyedItem.divLineDirectionE = divLineDirectionE;
                keyedItem.divLineWrapperE = divLineWrapperE;
                keyedItem.divLineFleetE = divLineFleetE;
                keyedItem.divLineNumberE = divLineNumberE;
                keyedItem.divLineNumberE = divLineNumberE;
                keyedItem.divNStopsE = divNStopsE;
                keyedItem.divSmallShapeRatioE = divSmallShapeRatioE;
                keyedItem.routeTitleDivE = routeTitleDivE;

                keyedItem.divLinesMsgE = divLinesMsgE;
                keyedItem.divLinesAttrMsgE = divLinesAttrMsgE;
                keyedItem.divLinesShapeMsg = divLinesShapeMsg;
                keyedItem.divLinesShapeMsgE = divLinesShapeMsgE;
            }

            var fleet = props.fleet.toUpperCase();

            keyedItem.isFIU = fleet[0] == 'F';
            keyedItem.fleetInt = keyedItem.isFIU ? 0 : 1;
            keyedItem.fleetIdInt = props.fleet_id;

            if (!(keyedItem.direction = lineDirections[props.direction.toLowerCase()])) { keyedItem.direction = { order: -1 }; }

            var directionObj = lineDirections[props.direction.toLowerCase()];
            var direction, directionInt;

            if (directionObj == undefined) { directionInt = 0; direction = "??"; } else { direction = directionObj.ab; directionInt = directionObj.order; }

            keyedItem.divLineWrapperE.style.backgroundColor = props.color;
            keyedItem.divLineFleetE.innerHTML = fleet;
            keyedItem.divLineDirectionE.innerHTML = direction;
            keyedItem.divLineDirectionE.title = 'Route Direction: ' + props.direction;

            keyedItem.divLineNumberE.innerHTML = props.fleet_id.slice(-4);
            keyedItem.divLineNumberE.title = props.identifier;

            keyedItem.directionInt = directionInt;

            keyedItem.divNStopsE.innerHTML = '' + props.platform_ids.length;

            if (canAdmin) {
                keyedItem.divSmallShapeRatioE.innerHTML = (data.nPointsSmallToLarge * 100).toFixed(0) + '%';
            }

            var identifier = props.identifier;

            if (!!keyedItem.divLinesMsgE) {
                var innerHTML = "";

                if (!!props.lineInnerHTML) {
                    innerHTML += props.lineInnerHTML;
                    keyedItem.divLinesAttrMsgE.style.backgroundColor = props.lineAttrBkColor;
                }
                else {
                    innerHTML += lineAttributesOngoingStr;
                    keyedItem.divLinesAttrMsgE.style.backgroundColor = colorLineAttrBkNormal;
                }

                keyedItem.divLinesAttrMsgE.innerHTML = innerHTML;

                innerHTML = "";

                //keyedItem.divLinesShapeMsg.ClearContent();
                keyedItem.divLinesShapeMsgE.style.backgroundColor = colorLineAttrBkNormal;

                if (!!extLineShapeLoader && !extLineShapeLoader.GetIsRefreshing()) {
                    var extLineShapeItem = extLineShapeLoader.GetShapesForITPALineItem(keyedItem);

                    if (!!extLineShapeItem) {
                        var extData = extLineShapeItem.GetData();
                        var bkColor;//, styleUse = statusButtonDisabledClasses;

                        if (extData.changedShape) {
                            innerHTML += 'Shape has changed<br />';
                        }
                        else {
                            innerHTML += 'Shape is current <br />';
                            keyedItem.divLinesShapeMsgE.style.backgroundColor = colorLineAttrBkCurrent;
                            //styleUse = statusButtonEnabledClasses;
                        }

                        if (shapeEditedLines[keyedItem.GetKey()] == keyedItem) {
                            keyedItem.divLinesShapeMsgE.style.backgroundColor = colorLineAttrBkNormal;
                            innerHTML += 'Custom Shape was edited<br />';
                        }

                        //keyedItem.editShapeButton.SetText(innerHTML);
                        //keyedItem.editShapeButton.SetStyle(styleUse);
                        //keyedItem.divLinesShapeMsg.AddContent(keyedItem.editShapeButton);
                        //innerHTML = undefined;
                    }
                    else {
                        innerHTML += 'Failed to retrieve Shape from external service<br />';
                    }
                }
                else {
                    innerHTML += 'Shape review is ongoing<br />';
                }

                if (innerHTML != undefined) {
                    keyedItem.divLinesShapeMsgE.innerHTML = innerHTML;
                }
            }

            keyedItem.routeTitleDivE.innerHTML = identifier;
            keyedItem.routeTitleDivE.title = props.identifier;
        }

        return { sender: theThis, content: content };
    }

    function getGarageRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var keyedItemKey = keyedItem.GetKey();
            var occupancyItem = !!occupancyKeyedList ? occupancyKeyedList.GetItem(keyedItemKey) : undefined;
            var data = keyedItem.GetData();
            var props = data.properties;
            var geom = data.geometry;

            if ((content = keyedItem.listContent) == undefined) {
                content = createContentContainer();

                var divGarageRowTop = new tf.dom.Div({ cssClass: "garageRowTop" });

                var divPkRecommendations = new tf.dom.Div({ cssClass: 'occupancy_wrapper' });
                var divPkEvents = new tf.dom.Div({ cssClass: 'occupancy_wrapper' });

                var divOccupancy = new tf.dom.Div({ cssClass: 'occupancy_wrapper' });
                var divGarage = createEditRow("garageDiv", "garageDivNonEdit", "Parking Site Name", 's', ITPA.Core.GarageListName, keyedItem, "identifier");
                var divCapacity = createEditRow("garageItemDiv", "garageItemDivNonEdit", "Parking Site Capacity", 'i', ITPA.Core.GarageListName, keyedItem, "capacity");
                var divTotalLevel = createEditRow("garageItemDiv", "garageItemDivNonEdit", "Parking Site Levels", 'i', ITPA.Core.GarageListName, keyedItem, "total_level");

                var divParkingSiteWrapper = new tf.dom.Div({ cssClass: "editRowWrapper" });
                var divParkingSiteTypeE;

                if (canAdmin) {
                    var buttonDim = "18px", textDim = buttonDim;

                    var parkingTypes = ["garage", "lot", "on street"];
                    var parkingTypeButtons = [];

                    for (var i = 0 ; i < parkingTypes.length ; ++i) {
                        var parkingType = parkingTypes[i];
                        var parkingTypeButton = styles.AddButtonDivMargins(new tf.ui.TextBtn({
                            dim: textDim, style: statusButtonUnSelectedClasses, label: parkingType, tooltip: 'Change to "' + parkingType + '"', onClick: getOnParkingTypeClicked(keyedItem, i + 1)
                        }));
                        divParkingSiteWrapper.AddContent(parkingTypeButton);
                        parkingTypeButtons.push(parkingTypeButton);
                    }

                    var statusButton = styles.AddButtonDivMargins(new tf.ui.TextBtn({
                        dim: textDim, style: statusButtonEnabledClasses, label: '', tooltip: "Change Status", onClick: getOnStatusClicked(keyedItem)
                    }));

                    statusButton.GetHTMLElement().style["float"] = "right";

                    divParkingSiteWrapper.AddContent(statusButton);
                }
                else {
                    var divParkingSiteType = new tf.dom.Div({ cssClass: "garageItemDivNonEdit" });
                    divParkingSiteTypeE = divParkingSiteType.GetHTMLElement();

                    divParkingSiteTypeE.title = "Parking Site Type and Status";
                    divParkingSiteWrapper.AddContent(divParkingSiteType);
                }

                var divGarageMsg = new tf.dom.Div({ cssClass: "garageMsgDiv" });
                var divGarageMsgE = divGarageMsg.GetHTMLElement();

                divGarageMsgE.title = 'Missing properties';

                divGarage.wrapper.AddContent(divOccupancy, divPkRecommendations, divPkEvents);

                content.AddContent(divGarageRowTop, divGarage.wrapper, divCapacity.wrapper, divTotalLevel.wrapper, divParkingSiteWrapper, divGarageMsg);

                keyedItem.listContent = content;
                keyedItem.divGarageE = divGarage.contentE;
                keyedItem.divCapacityE = divCapacity.contentE;
                keyedItem.divTotalLevelE = divTotalLevel.contentE;
                keyedItem.divParkingSiteTypeE = divParkingSiteTypeE;
                keyedItem.divGarageMsgE = divGarageMsgE;
                keyedItem.statusButton = statusButton;
                keyedItem.parkingTypeButtons = parkingTypeButtons;
                keyedItem.divOccupancyE = divOccupancy.GetHTMLElement();
                keyedItem.divPkRecommendations = divPkRecommendations;
                keyedItem.divPkEvents = divPkEvents;
            }

            var title = props.identifier;
            var capacity = props.capacity;
            var hasOccupancy = false;

            if (!!occupancyItem) {
                var occd = occupancyItem.GetData(), occp = occd.properties;
                if (!!occp.available_percentage_str) {
                    //var occTitle = '<br/>' + occp.available + ' of ' + occp.total + ' (' + occp.available_percentage_str + ') available)';
                    //var occTitle = occp.available_percentage_str + ' (' + occp.available + ' of ' + occp.total + ') available';

                    var bkColor = appStyles.GetColorForOccupancy01(1 - occp.available_01);
                    var occContent = '<div class="occupancy-item" style="background-color:' + bkColor + ';">Total ' + occp.available_percentage_str + ' (' + occp.available + ' of ' + occp.total + ') available' + '</div>';

                    for (var occpItemIndex in occp.items) {
                        var occpItem = occp.items[occpItemIndex];
                        bkColor = appStyles.GetColorForOccupancy01(1 - occpItem.available_01);
                        var thisContent = '<div class="occupancy-item" style="background-color:' + bkColor + ';">' + occpItem.decalGroup + ' ' + occpItem.available_percentage_str + ' (' + occpItem.available + ' of ' + occpItem.total + ') available' + '</div>';
                        occContent += thisContent;
                    }

                    capacity = occp.total;
                    hasOccupancy = true;
                    keyedItem.divOccupancyE.innerHTML = occContent;
                    //var oc01 = 1 - occp.available_01;
                    //keyedItem.divOccupancyE.style.backgroundColor = appStyles.GetColorForOccupancy01(oc01);
                }
            }
            keyedItem.divOccupancyE.style.display = hasOccupancy ? 'block' : 'none';

            keyedItem.divGarageE.innerHTML = title;

            keyedItem.divCapacityE.innerHTML = capacity + ' parking ' + (capacity == 1 ? 'space' : 'spaces');
            keyedItem.divTotalLevelE.innerHTML = props.total_level + (props.total_level == 1 ? ' level' : ' levels');

            if (canAdmin) {
                keyedItem.statusButton.SetStyle(props.is_active ? statusButtonEnabledClasses : statusButtonDisabledClasses);
                keyedItem.statusButton.SetText(props.is_active ? "Active" : "Inactive");
                for (var i = 0 ; i < 3 ; ++i) {
                    keyedItem.parkingTypeButtons[i].SetStyle((i + 1) == props.parking_site_type_id ? statusButtonSelectedClasses : statusButtonUnSelectedClasses);
                }
            }
            else {
                keyedItem.divParkingSiteTypeE.innerHTML = "type: " + props.parking_site_type_name;
            }

            var errorStr = undefined;

            if (geom == undefined || geom.coordinates == undefined) {
                if (errorStr != undefined) { errorStr += ", Shape"; } else { errorStr = "missing Shape"; }
            }

            if (props.centroid == undefined) {
                if (errorStr != undefined) { errorStr += ", Centroid"; } else { errorStr = "missing Centroid"; }
            }

            if (errorStr != undefined) {
                keyedItem.divGarageMsgE.innerHTML = errorStr;
                keyedItem.divGarageMsgE.style.display = 'block';
            }
            else {
                keyedItem.divGarageMsgE.style.display = 'none';
            }

            showPkRecommendations(keyedItem);
            showPkEvents(keyedItem);
        }
        return { sender: theThis, content: content };
    }

    function getMessageRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var props = data.properties;

            if ((content = keyedItem.listContent) == undefined) {
                content = createContentContainer();

                var divMessageWrapper = new tf.dom.Div({ cssClass: "messageDivWrapper" });
                var divMessage = new tf.dom.Div({ cssClass: "messageDiv" });
                var divMessageE = divMessage.GetHTMLElement();
                var divMessageDetail = new tf.dom.Div({ cssClass: "messageDivDetail" });
                var divMessageDetailE = divMessageDetail.GetHTMLElement();

                divMessageWrapper.AddContent(divMessage, divMessageDetail);
                content.AddContent(divMessageWrapper);

                keyedItem.listContent = content;
                keyedItem.divMessageE = divMessageE;
                keyedItem.divMessageDetailE = divMessageDetailE;
            }

            keyedItem.divMessageE.innerHTML = props.message;
            keyedItem.divMessageDetailE.innerHTML = props.message_board_location + '<br/>' + props.highway + ', ' + props.region;
        }
        return { sender: theThis, content: content };
    }

    function getIncidentRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var props = data.properties;

            if ((content = keyedItem.listContent) == undefined) {
                content = createContentContainer();

                var divIncident = new tf.dom.Div({ cssClass: "incidentDiv" });
                var divIncidentE = divIncident.GetHTMLElement();

                content.AddContent(divIncident);

                keyedItem.listContent = content;
                keyedItem.divIncidentE = divIncidentE;
            }

            keyedItem.divIncidentE.innerHTML =
                props.external_incident_type +
                (props.remarks != undefined ? '<br />' + props.remarks : '');
        }
        return { sender: theThis, content: content };
    }

    function updateBusETAs(keyedItem) {
        if (!!keyedItem && !!keyedItem.divBusETAsE) {
            //var busETAList = etaList.GetBusETAList(keyedItem.GetKey());
            //var count = busETAList ? busETAList.GetItemCount() : 0;
            var busEtas = etaList.GetEtasForBusId(keyedItem.GetData().properties.public_transport_vehicle_id);
            var count = !!busEtas ? busEtas.etas.length : 0;
            keyedItem.divBusETAsE.innerHTML = '' + count;
        }
    }

    function getBusRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var props = data.properties;
            var geom = data.geometry, coords = !!geom ? geom.coordinates : ['?', '?'];
            var busLineItem = linesKeyedList.GetItem(props.line_id);
            var busLineP = !!busLineItem ? busLineItem.GetData().properties : undefined;

            keyedItem.busLine = busLineItem;

            //keyedItem.busLine = undefined;
            //busLineP = undefined;

            if ((content = keyedItem.listContent) == undefined) {
                content = createContentContainer();

                var divAllWrapper = new tf.dom.Div({ cssClass: "busAllWrapper" })

                var divLineWrapper = new tf.dom.Div({ cssClass: "busLineDivWrapper" });
                var divLineFleet = new tf.dom.Div({ cssClass: "busLineDivFleet" });
                var divLineNumber = new tf.dom.Div({ cssClass: "busLineDivNumber" });
                var divLineDirection = new tf.dom.Div({ cssClass: "busLineDivDirection" });

                var divLineWrapperE = divLineWrapper.GetHTMLElement();
                var divLineFleetE = divLineFleet.GetHTMLElement();
                var divLineNumberE = divLineNumber.GetHTMLElement();
                var divLineDirectionE = divLineDirection.GetHTMLElement();

                divLineFleetE.title = "Bus Fleet";
                divLineNumberE.title = "Bus Route"
                divLineDirectionE.title = "Route Direction";

                var divBusWrapper = new tf.dom.Div({ cssClass: "busDivWrapper" });
                var divBusNumber = new tf.dom.Div({ cssClass: "busDivNumber" });
                var divBusNumberE = divBusNumber.GetHTMLElement();
                var divBusSpeed = new tf.dom.Div({ cssClass: "busDivSpeed" });
                var divBusETAs =  new tf.dom.Div({ cssClass: "busDivETAs" });

                var divBusSpeedE = divBusSpeed.GetHTMLElement();
                var divBusETAsE = divBusETAs.GetHTMLElement();

                divBusSpeedE.title = "Bus Speed";
                divBusETAsE.title = "Bus Stop ETA Count";

                divLineWrapper.AddContent(divLineFleet, divLineNumber, divLineDirection);
                divBusWrapper.AddContent(divBusNumber, divBusETAs, divBusSpeed);

                divAllWrapper.AddContent(divLineWrapper, divBusWrapper);

                content.AddContent(divAllWrapper);

                keyedItem.listContent = content;

                keyedItem.divLineDirectionE = divLineDirectionE;
                keyedItem.divBusNumberE = divBusNumberE;
                keyedItem.divBusSpeedE = divBusSpeedE;
                keyedItem.divLineWrapperE = divLineWrapperE;
                keyedItem.divLineFleetE = divLineFleetE;
                keyedItem.divLineNumberE = divLineNumberE;
                keyedItem.divBusETAsE = divBusETAsE;
                keyedItem.divLineNumberE = divLineNumberE;
            }

            var directionInt = 0, direction = '??', directionLong = 'Unknown';
            var lineColor = 'magenta';
            var fleet = '???';
            var lineFleetId = '???', lineIdentifier = 'Unknown fleet';

            if (!!busLineP) {
                var directionObj = lineDirections[busLineP.direction.toLowerCase()];

                if (directionObj != undefined) { direction = directionObj.ab; directionInt = directionObj.order; }

                lineColor = busLineP.color
                fleet = busLineP.fleet.toUpperCase();
                directionLong = busLineP.direction;

                lineFleetId = busLineP.fleet_id.slice(-4);
                lineIdentifier = busLineP.identifier;

                keyedItem.fleetIdInt = parseInt(busLineP.fleet_id, 10);
                keyedItem.nameInt = parseInt(props.name, 10);
                keyedItem.divLineFleetE.title = "Bus fleet";
            }
            else {
                keyedItem.nameInt = keyedItem.fleetIdInt = 0;
                keyedItem.divLineFleetE.title = "Unknown fleet";
            }

            var fleet1stChar = fleet[0];
            keyedItem.fleetInt = fleet1stChar == '?' ? -1 : (fleet1stChar == 'F' ? 0 : 1);
            keyedItem.directionInt = directionInt;

            keyedItem.divLineWrapperE.style.backgroundColor = lineColor;
            keyedItem.divLineFleetE.innerHTML = fleet;
            keyedItem.divLineDirectionE.innerHTML = direction;
            keyedItem.divLineDirectionE.title = 'Route Direction: ' + directionLong;
            keyedItem.divLineNumberE.innerHTML = lineFleetId;
            keyedItem.divLineNumberE.title = lineIdentifier;
            var speedStr = props.speed >= 0.5 ? Math.round(props.speed) + 'mph' : 'idle';

            keyedItem.divBusNumberE.title = "Bus Number";
            keyedItem.divBusNumberE.style.backgroundColor = "#3399ff";

            if (props.number_of_occupants != 0) {
                var ocp = ITPA.Core.GetOccupancyPercentage01(props.number_of_occupants);

                if (ocp != undefined) {
                    var label = (ocp * 100).toFixed(0) + '% full';
                    keyedItem.divBusNumberE.title = label;
                    keyedItem.divBusNumberE.style.backgroundColor = "#003377";
                }
            }

            keyedItem.divBusNumberE.innerHTML = props.name;

            keyedItem.divBusSpeedE.innerHTML = speedStr;
            keyedItem.divBusSpeedE.title = 'lat: ' + coords[1] + ' lng: ' + coords[0];

            updateBusETAs(keyedItem);

        }
        return { sender: theThis, content: content };
    }

    function getNotificationRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var props = keyedItem.GetData();

            // class_id, icon, notification_id, url

            if ((content = keyedItem.listContent) == undefined) {
                content = createContentContainer();

                var divWrapper = new tf.dom.Div({ cssClass: "notificationDivWrapper" });
                var divTitle = new tf.dom.Div({ cssClass: "notificationTitleDiv" });
                var divTitleE = divTitle.GetHTMLElement();
                var divSummaryIcon = new tf.dom.Div({ cssClass: "notificationSummaryIconDiv" });
                var divSummary = new tf.dom.Div({ cssClass: "notificationSummaryDiv" });
                var divSummaryE = divSummary.GetHTMLElement();
                var divIcon = new tf.dom.Div({ cssClass: "notificationIconDiv" });
                var divIconE = divIcon.GetHTMLElement();
                //var divURLA = new tf.dom.Div({ cssClass: "notificationURLA" });
                var divURLAE = document.createElement('a');//divURLA.GetHTMLElement();

                divURLAE.title = "Click to visit web site";
                divURLAE.target = "_blank";
                divURLAE.className = "notificationURLA";

                divSummaryIcon.AddContent(divIcon, divSummary);

                divWrapper.AddContent(divTitle, divSummaryIcon, divURLAE);
                content.AddContent(divWrapper);

                keyedItem.listContent = content;
                keyedItem.divTitleE = divTitleE;
                keyedItem.divIconE = divIconE;
                keyedItem.divSummaryE = divSummaryE;
                keyedItem.divURLAE = divURLAE;
            }

            if (!!props.icon) {
                keyedItem.divIconE.style.display = 'block';
                keyedItem.divIconE.innerHTML = "<img class='notificationIconImg' src='" + props.icon + "' />";
            }
            else {
                keyedItem.divIconE.style.display = 'none';
            }

            if (!!props.url) {
                keyedItem.divURLAE.style.display = 'block';
                keyedItem.divURLAE.href = keyedItem.divURLAE.innerHTML = props.url;
            }
            else {
                keyedItem.divURLAE.style.display = 'hidden';
            }

            keyedItem.id = props.notification_id;
            keyedItem.divTitleE.innerHTML = props.title;
            keyedItem.divSummaryE.innerHTML = props.summary;
        }
        return { sender: theThis, content: content };
    }

    function sortBusRows(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        if (kia.fleetInt != kib.fleetInt) { return kia.fleetInt - kib.fleetInt; }
        if (kia.fleetIdInt != kib.fleetIdInt) { return kia.fleetIdInt - kib.fleetIdInt; }
        if (kia.directionInt != kib.directionInt) { return kia.directionInt - kib.directionInt; }
        return kia.nameInt - kib.nameInt;
    }

    function sortRouteRows(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        if (kia.fleetInt != kib.fleetInt) { return kia.fleetInt - kib.fleetInt; }
        if (kia.fleetIdInt != kib.fleetIdInt) { return kia.fleetIdInt - kib.fleetIdInt; }
        return kia.directionInt - kib.directionInt;
    }

    function sortNotificationRows(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        return kib.id - kia.id;
    }

    function sortMessagesRows(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        var pa = kia.GetData().properties, pb = kib.GetData().properties;
        return pa.message == pb.message ? 0 : pa.message > pb.message ? 1 : -1;
    }

    function sortDeviceRows(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        var pa = kia.GetData().properties, pb = kib.GetData().properties;
        return pb.last_position_on_date > pa.last_position_on_date ? 1 : (pb.last_position_on_date < pa.last_position_on_date ? -1 : 0);
    }

    function sortUserRows(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        if (kia.ec != kib.ec) { return kia.ec - kib.ec; }
        return kia.email < kib.email ? -1 : 1;
    }

    function sortPlatforms(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        var pa = kia.GetData().properties;
        var pb = kib.GetData().properties;
        if (pa.fleet != pb.fleet) { return pa.fleet < pb.fleet ? -1 : 1; }
        return parseInt(pa.fleet_id, 10) - parseInt(pb.fleet_id, 10);
    }

    function sortGarages(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        var pa = kia.GetData().properties, pb = kib.GetData().properties;
        return pa.identifier == pb.identifier ? 0 : pa.identifier < pb.identifier ? -1 : 1;
    }

    function createLists() {
        var listNamesCreate = [
            ITPA.Core.BusListName,
            ITPA.Core.PlatformListName,
            ITPA.Core.RouteListName,
            ITPA.Core.GarageListName,
            ITPA.Core.MessageListName,
            ITPA.Core.IncidentListName,
            ITPA.Core.NotificationListName
        ];

        var listLayoutDivE = listLayoutDiv.GetHTMLElement();
        var listLayoutDivES = listLayoutDivE.style;

        listLayoutDivES.marginTop = "0px";
        listLayoutDivES.overflow = 'hidden';
        //listLayoutDivES.borderBottom = '2px solid green';

        if (canAdmin) {
            listNamesCreate.push(ITPA.Core.DeviceListName);
            listNamesCreate.push(ITPA.Core.UserListName);
        }

        lists = {};

        var getRowContent = {};
        getRowContent[ITPA.Core.BusListName] = getBusRowContent;
        getRowContent[ITPA.Core.PlatformListName] = getStopRowContent;
        getRowContent[ITPA.Core.RouteListName] = getRouteRowContent;
        getRowContent[ITPA.Core.GarageListName] = getGarageRowContent;
        getRowContent[ITPA.Core.MessageListName] = getMessageRowContent;
        getRowContent[ITPA.Core.IncidentListName] = getIncidentRowContent;
        getRowContent[ITPA.Core.DeviceListName] = getDeviceRowContent;
        getRowContent[ITPA.Core.NotificationListName] = getNotificationRowContent;
        getRowContent[ITPA.Core.UserListName] = getUserRowContent;

        var sortFncs = {};
        sortFncs[ITPA.Core.BusListName] = sortBusRows;
        sortFncs[ITPA.Core.NotificationListName] = sortNotificationRows;
        sortFncs[ITPA.Core.RouteListName] = sortRouteRows;
        sortFncs[ITPA.Core.MessageListName] = sortMessagesRows;
        sortFncs[ITPA.Core.DeviceListName] = sortDeviceRows;
        sortFncs[ITPA.Core.UserListName] = sortUserRows;
        sortFncs[ITPA.Core.GarageListName] = sortGarages;
        sortFncs[ITPA.Core.PlatformListName] = sortPlatforms;

        tableSettings = { backgroundColor: "#000", selectOnHover: false, onSelect: undefined };
        tableRowStyle = {
            "tf-shadow": [0, 0, 3, "rgba(0,0,0,0.6)"],
            "textShadow": "1px 1px 1px #333",
            "border": "2px solid #fff",
            "backgroundColor": "rgba(255, 255, 255, 1)",
            "color": "#fff", "borderRadius": "4px",// "margin": "4px",
            "padding": "1px",
            paddingLeft: "6px",
            paddingRight: "6px",
            //width: "calc(100% - 20px)",
            overflow:"hidden"
        };
        tableRowHoverStyle = {
            "tf-shadow": [0, 0, 3, "rgba(0,0,0,0.6)"],
            "textShadow": "1px 1px 1px #333",
            "border": "2px dotted #000",
            //"backgroundColor": "rgba(190, 204, 234, 1)",
            "backgroundColor": "rgba(243, 215, 144, 1)",
            "color": "#fff", "borderRadius": "4px",// "margin": "4px",
            "padding": "1px",
            paddingLeft: "6px",
            paddingRight: "6px",
            //width: "calc(100% - 20px)",
            overflow: "hidden"
        };
        var rowSettings = { style: tableRowStyle, selectedStyle: tableRowHoverStyle };

        var tableScrollerParentDiv = new tf.dom.Div({ cssClass: "tableScrollerParentDiv" });
        var tableFooterDiv = new tf.dom.Div({ cssClass: "tableFooterDiv" });

        tableFooterDivE = tableFooterDiv.GetHTMLElement();

        for (var i in listNamesCreate) {
            var listName = listNamesCreate[i];
            var coreList = core.GetList(listName);
            var featureList = coreFeatureLists.GetFeatureList(listName);
            if (!!coreList /*&& !!featureList*/) {
                tableSettings.onSelect = getOnSelectTableRow(listName);
                var list = new ITPA.OC.FeatureTable({
                    tables: theThis, featureName: listName, coreList: coreList, featureList: featureList,
                    tableSettings: tableSettings, rowSettings: rowSettings, getRowContent: getRowContent[listName],
                    onTableChanged: getOnTableChanged(listName),
                    onScroll: onTableScroll
                });
                list.GetTable().SetSort(sortFncs[listName]);
                lists[listName] = list;
                tableScrollerParentDiv.AddContent(list.GetTableParent());
                selectFirstRowIfNoneSelected(listName, false);
            }
        }

        var confirmStyle = { zIndex: 20, position: "absolute", left: "6px", top: "6px", boxShadow: "3px 3px 6px rgba(0,0,0,0.5)" };

        confirmMsg = new tf.ui.ConfirmMsg({
            container: tableScrollerParentDiv, timeout: 8000, className: "addGaragesMsgStyle", style: confirmStyle,
            yesTooltip: 'Click to add a new Parking Sarage', noTooltip: 'Click to cancel',
            buttonsDivClassName: 'addGarageButtonsDiv',
            msgClassName: "addGarageMsgDiv"
        });

        //var toasterStyle = { zIndex: 20, position: "absolute", left: "6px", top: "6px", boxShadow: "3px 3px 6px rgba(0,0,0,0.5)" };
        //toaster = new tf.ui.Toaster({ container: tableScrollerParentDiv, timeout: 2000, className: "tableToastStyle", style: toasterStyle });
        var toasterStyle = { zIndex: 20, position: "absolute", left: "0px", top: "0px" };
        toaster = new tf.ui.Toaster({
            container: tableScrollerParentDiv, timeout: 2000, className: "", style: toasterStyle, toastClassName: "tableToastStyle", toastStyle: {
                display: "block", margin: "6px", boxShadow: "3px 3px 6px rgba(0,0,0,0.5)"
            }, addBefore: true
        });

        listLayoutDiv.AddContent(tableScrollerParentDiv, tableFooterDiv);
    }

    function onTableScroll(notification) {
        if (inPlaceTextAreaSingleLine.IsAttached()) {
            //inPlaceTextAreaSingleLine.UpdatePos();
            inPlaceTextAreaSingleLine.RevertText();
            inPlaceTextAreaSingleLine.Detach();
        }
    }

    function createIcon(className, paddingTop) {
        var icon;
        var src = ITPA.OC.ButtonClassSrc[className];
        if (src != undefined) {
            var icon = document.createElement('img'); icon.className = "svg-icon-button"; icon.src = src;
            //var icon = document.createElement('img'); icon.className = className + " svg-icon-button"; //icon.src = './images/pencil.svg';
            //var icon = document.createElement('icon'); icon.className = className;
            icon.style.paddingTop = paddingTop != undefined ? paddingTop : "4px";
        }
        return icon;
    }

    function createButton(className, eventListener, title, tooltip) {
        var button = document.createElement('button');
        button.className = className;
        button.style.pointerEvents = "all";
        button.style.display = "inline-block";
        button.addEventListener('click', eventListener);
        if (tf.js.GetIsNonEmptyString(title)) { button.innerHTML = title; }
        if (tf.js.GetIsNonEmptyString(tooltip)) { button.title = tooltip; }
        return button;
    }

    function getOnClick(listName) { return function () { setList(listName); } }

    function createHeader() {
        var listLayoutToolbarTabE = listLayoutToolbarTab.GetHTMLElement();
        var listLayoutToolbarTabES = listLayoutToolbarTabE.style;

        listLayoutToolbarTabES.height = "initial";
        listLayoutToolbarTabES.paddingBottom = "0px";

        var listButtonsWrapper = new tf.dom.Div({ cssClass: "listButtonsWrapper" });

        var classListNames = [
            { className: "bus-button", listName: ITPA.Core.BusListName, tt: "buses" },
            { className: "stop-button", listName: ITPA.Core.PlatformListName, tt: "bus stops" },
            { className: "lines-button", listName: ITPA.Core.RouteListName, tt: "bus lines" },
            { className: "parking-button", listName: ITPA.Core.GarageListName, tt: "parking sites" },
            { className: "msg-button", listName: ITPA.Core.MessageListName, tt: "messages" },
            { className: "inc-button", listName: ITPA.Core.IncidentListName, tt: "incidents" },
            { className: "notification-button", listName: ITPA.Core.NotificationListName, tt: "active ITPA Messages to Mobile Devices" }
        ];

        if (canAdmin) {
            classListNames.push({ className: "device-button", listName: ITPA.Core.DeviceListName, tt: "devices" });
            classListNames.push({ className: "user-button", listName: ITPA.Core.UserListName, tt: "users" });
        }

        buttonsWrappers = {};
        buttons = {};

        for (var i in classListNames) {
            var classListName = classListNames[i];
            var className = classListName.className;
            var listName = classListName.listName;
            var tt = classListName.tt;
            var button = createButton("list-button", getOnClick(listName), undefined, "List " + tt);
            var buttonWrapper = new tf.dom.Div({ cssClass: "listButtonWrapper listButtonWrapperWithHover" });
            button.appendChild(createIcon(className));
            buttonWrapper.AddContent(button);
            listButtonsWrapper.AddContent(buttonWrapper);
            buttonsWrappers[listName] = buttonWrapper;
            buttons[listName] = button;
            lastButton = button;
        }

        lastButton.style.marginRight = "0px";
        lastButton = undefined;

        listLayoutToolbarTab.AddContent(listButtonsWrapper);
    }

    function hideCurFloatEditor() { if (curFloatEditor != undefined) { curFloatEditor.Show(false); curFloatEditor = undefined; } }

    function onFloatEditorHidItself(notification) { if (curFloatEditor == notification.sender) { curFloatEditor = undefined; } }

    function setCurFloatEditor(editor) {
        var cfe = curFloatEditor;
        hideCurFloatEditor();
        if (cfe != editor && editor != undefined) { (curFloatEditor = editor).Show(true); }
    }

    function createFloatEditor(type) {
        return new type({
            tables: theThis,
            oc: oc, onSelfHide: onFloatEditorHidItself,
            tableSettings: tableSettings, tableRowStyle: tableRowStyle, tableRowHoverStyle: tableRowHoverStyle
        });
    }

    function onEditRouteStops() {
        if (!routeStopsEditor) { routeStopsEditor = createFloatEditor(ITPA.OC.RouteStopsEditor); }
        setCurFloatEditor(routeStopsEditor);
    }

    function onEditNotifications() {
        if (!notificationEditor) { notificationEditor = createFloatEditor(ITPA.OC.NotificationEditor); }
        setCurFloatEditor(notificationEditor);
    }

    function onRefreshGarageList() {
        if (!!garageList) { garageList.RefreshNow(); }
        if (!!occupancyList) { occupancyList.RefreshNow(); }
    }

    /*function onRefreshGarageListFromButton() {
        setCurMapEditor(undefined);
        onRefreshGarageList();
    }*/

    function makeToolBarWrapper() {
        var listButtonsWrapper = new tf.dom.Div({ cssClass: "listButtonsWrapper" });
        var listButtonsWrapperE = listButtonsWrapper.GetHTMLElement();
        var listButtonsWrapperES = listButtonsWrapperE.style;
        listButtonsWrapperES.padding = "0px";
        return listButtonsWrapper;
    }

    function makeToolBarButton(iconClassName, onClick, toolTip, iconPaddingTop, noHoverBool) {
        var buttonWrapper = new tf.dom.Div({ cssClass: "listButtonWrapper" });
        if (!noHoverBool) { tf.dom.AddCSSClass(buttonWrapper, "listButtonWrapperWithHover"); }
        var button = createButton("list-button", onClick, undefined, toolTip);
        button.appendChild(createIcon(iconClassName, iconPaddingTop));
        if (noHoverBool) {
            tf.dom.AddCSSClass(button, "rowButtonWrapperWithHover");
        }
        buttonWrapper.AddContent(button);
        return { button: button, wrapper: buttonWrapper };
    }

    function makeNotificationToolBar() {
        if (canAdmin) {
            var listButtonsWrapper = makeToolBarWrapper();
            var editButton = makeToolBarButton("pencil-button", onEditNotifications, "Show/Hide ITPA Messages Editor");
            listButtonsWrapper.AddContent(editButton.wrapper);
            return { toolBar: listButtonsWrapper, onTableRowSelect: function (notification) { } };
        }
        return undefined;
    }

    function makeMessagesToolBar() {
        var listButtonsWrapper = makeToolBarWrapper();
        var viewITPAServiceDataButton = makeToolBarButton("download-button", onViewMessagesITPAData, "View raw ITPA Message Board service data");
        var viewITPAServiceDataButtonES = viewITPAServiceDataButton.wrapper.GetHTMLElement().style;

        listButtonsWrapper.AddContent(viewITPAServiceDataButton.wrapper);
        viewITPAServiceDataButtonES.display = 'none';

        return {
            toolBar: listButtonsWrapper, onTableRowSelect: function (notification) {
                var doShow = !!notification.selected;
                var display = doShow ? 'inline-block' : 'none';
                viewITPAServiceDataButtonES.display = display;
            }
        };
    }

    function makeIncidentsToolBar() {
        var listButtonsWrapper = makeToolBarWrapper();
        var viewITPAServiceDataButton = makeToolBarButton("download-button", onViewIncidentsITPAData, "View raw ITPA Incident service data");
        var viewITPAServiceDataButtonES = viewITPAServiceDataButton.wrapper.GetHTMLElement().style;

        listButtonsWrapper.AddContent(viewITPAServiceDataButton.wrapper);
        viewITPAServiceDataButtonES.display = 'none';

        return {
            toolBar: listButtonsWrapper, onTableRowSelect: function (notification) {
                var doShow = !!notification.selected;
                var display = doShow ? 'inline-block' : 'none';
                viewITPAServiceDataButtonES.display = display;
            }
        };
    }

    function hasAndCanSubmitLinesUpdate() {
        if (isSubmittingLinesUpdate) { return false; }
        if (!extLineLoader) { return false; }
        if (extLineLoader.GetIsRefreshing()) { return false; }
        if (!extLineShapeLoader) { return false; }
        if (extLineShapeLoader.GetIsRefreshing()) { return false; }
        if (newFIULines.length == 0 && modifiedLines.length == 0) { return false; }
        return true;
    }

    function checkShowLinesUpdateButton() {
        if (!!linesUpdateButton) {
            var showButton = hasAndCanSubmitLinesUpdate();
            var title = "";
            if (showButton) {
                var nNewFIULines = newFIULines.length;
                var nAttrChangeLines = modifiedLines.length;
                if (nNewFIULines) { title += 'Add ' + nNewFIULines + ' new FIU lines'; }
                if (nAttrChangeLines) {
                    var lineLines = ' line'; if (nAttrChangeLines != 1) { lineLines += 's'; }
                    if (nNewFIULines) { title += ' and update'; } else { title += 'Update'; } title += ' attributes and/or shape of ' + nAttrChangeLines + lineLines;
                }
            }
            var displayStr = showButton ? 'inline-block' : 'none';
            linesUpdateButton.button.style.display = displayStr;
            linesUpdateButton.button.title = title;
        }
    }

    function createLineAttributeUpdateRecord(itpaLineItem, xd) {
        var line_id, shape_c, shape_sm_c;

        if (!!itpaLineItem) {
            var data = itpaLineItem.GetData(), p = data.properties;
            line_id = p.line_id;
            shape_sm_c = p.shape_sm_c;
            shape_c = p.shape_c;
            var lineShape = extLineShapeLoader.GetShapesForITPALineItem(itpaLineItem);
            if (!!lineShape) {
                var extData = lineShape.GetData();
                if (extData.changedShape) {
                    shape_c = [];
                    for (var i in extData.shapes) {
                        var s = extData.shapes[i].shape;
                        shape_c.push(s);
                    }
                    shape_c = JSON.stringify(shape_c);
                }
            }
        }
        else {
            line_id = 0;
            shape_sm_c = shape_c = undefined;
            if (xd.isFIU) {
                var lineShape = extLineShapeLoader.GetFIULineByFleetId(xd.fleet_id);
                if (!!lineShape) {
                    shape_c = [];
                    for (var i in lineShape.shapes) {
                        var s = lineShape.shapes[i].shape;
                        shape_c.push(s);
                    }
                    shape_c = JSON.stringify(shape_c);
                    shape_sm_c = shape_c;
                }
            }
        }

        return {
            shape_c: shape_c,
            shape_sm_c: shape_sm_c,
            identifier: xd.identifier,
            color: xd.color,
            fleet: xd.fleet,
            fleet_id: xd.fleet_id,
            direction: xd.direction,
            line_id: line_id
        };
    }

    function onUpdateLineAttributes() {
        if (hasAndCanSubmitLinesUpdate()) {
            var line_index = [];

            for (var i in newFIULines) {
                var nfl = newFIULines[i];
                var updateItem = createLineAttributeUpdateRecord(undefined, nfl.xd);
                if (!!updateItem) { line_index.push(updateItem); }
            }

            for (var i in modifiedLines) {
                var ml = modifiedLines[i];
                var updateItem = createLineAttributeUpdateRecord(ml.itpaItem, ml.xd);
                if (!!updateItem) { line_index.push(updateItem); }
            }

            if (line_index.length > 0) {
                var updateRecord = {
                    line_index: line_index
                };

                //var debugRecord = true;
                var debugRecord = false;

                if (debugRecord) {
                    window.open(null).document.write(JSON.stringify(updateRecord));
                }
                else {
                    isSubmittingLinesUpdate = true;
                    checkShowLinesUpdateButton();
                    linesList.UpdateLines(updateRecord, function (notification) {
                        var success = false;
                        if (!!notification) {
                            toaster.Toast({ text: notification.message });
                        }
                        else {
                            toaster.Toast({ text: "Failed to contact server" });
                        }
                        //isSubmittingLinesUpdate = false;
                        //appLayout.CheckRefreshRoutes();
                        //checkShowLinesUpdateButton();
                    });
                }
            }
        }
        return false;
    }

    function onBusLineJSONConfirm(notification) {
        var list = !!notification ? notification.list : undefined;
        var len = !!list ? list.length : undefined;

        if (len > 0) {
            for (var i = 0 ; i < len ; ++i) {
                var item = list[i], keyedItem = item.routeItem;
                var d = keyedItem.GetData(), p = d.properties;
                p.geometry = item.geometry;
                p.shape_sm_c = item.shape_sm_c;
                doAddModifiedLine(keyedItem);
                shapeEditedLines[keyedItem.GetKey()] = keyedItem;
                keyedItem.NotifyUpdated();
            }
            checkShowLinesUpdateButton();
            var shapeShapes = "shape"; if (len != 1) { shapeShapes += 's'; }
            toaster.Toast({ text: "Updated " + len + " Bus line " + shapeShapes });
        }
    }

    function onLoadBusLinesFromJSON(notification) { fullScreenBusLineJSON.Show(); return false; }

    function makeRoutesToolBar() {
        var listButtonsWrapper = makeToolBarWrapper();

        var editButtonES, loadJSONButtonES;

        if (canAdmin) {
            var editButton = makeToolBarButton("pencil-button", onEditRouteShape, "Edit bus line custom shape");
            editButtonES = editButton.wrapper.GetHTMLElement().style;
            editButtonES.display = 'none';


            var loadJSONButton = makeToolBarButton("json-button", onLoadBusLinesFromJSON, "Load bus line shapes from JSON");
            loadJSONButtonES = loadJSONButton.wrapper.GetHTMLElement().style;
            loadJSONButtonES.display = 'none';

            listButtonsWrapper.AddContent(loadJSONButton.wrapper, editButton.wrapper);
        }

        var viewITPAServiceDataButton = makeToolBarButton("download-button", onViewLinesITPAData, "View raw ITPA Bus line service data");
        var viewITPAServiceDataButtonES = viewITPAServiceDataButton.wrapper.GetHTMLElement().style;

        var viewExternalServiceDataButton = makeToolBarButton("download2-button", onViewLinesExternalData, "View raw External Bus Line service data");
        var viewExternalServiceDataButtonES = viewExternalServiceDataButton.wrapper.GetHTMLElement().style;

        listButtonsWrapper.AddContent(viewITPAServiceDataButton.wrapper, viewExternalServiceDataButton.wrapper);

        if (canAdmin) {
            linesUpdateButton = makeToolBarButton("upload-button", onUpdateLineAttributes, "Update line attributes");
            listButtonsWrapper.AddContent(linesUpdateButton.wrapper);
        }

        viewITPAServiceDataButtonES.display = 'none';
        viewExternalServiceDataButtonES.display = 'none';

        checkShowLinesUpdateButton();

        return {
            toolBar: listButtonsWrapper, onTableRowSelect: function (notification) {
                var doShow = !!notification.selected;
                var display = doShow ? 'inline-block' : 'none';
                viewITPAServiceDataButtonES.display = display;
                viewExternalServiceDataButtonES.display = display;
                if (!!editButtonES) { editButtonES.display = display; }
                if (!!loadJSONButtonES) { loadJSONButtonES.display = display; }
            }
        };
    }

    function makeGaragesToolBar() {
        var listButtonsWrapper = makeToolBarWrapper();
        //var refreshButton = makeToolBarButton("refresh-button", onRefreshGarageListFromButton, "Refresh Parking Site List");
        var editCentroidButton, editShapeButton, addGarageButton;
        var editCentroidButtonES, editShapeButtonES, addGarageButtonES;

        var viewITPAServiceDataButton = makeToolBarButton("download-button", onViewGaragesITPAData, "View raw ITPA Parking Site service data");
        var viewITPAServiceDataButtonES = viewITPAServiceDataButton.wrapper.GetHTMLElement().style;

        //listButtonsWrapper.AddContent(refreshButton.wrapper, viewITPAServiceDataButton.wrapper);

        if (canAdmin) {
            editShapeButton = makeToolBarButton("polygon-button", onEditGarageShape, "Edit Parking Site Shape");
            editCentroidButton = makeToolBarButton("track-button", onEditGarageCentroid, "Edit Parking Site Centroid");
            addGarageButton = makeToolBarButton("plus-button", onAddNewGarage, "Add new Parking Site");

            listButtonsWrapper.AddContent(editShapeButton.wrapper, editCentroidButton.wrapper, addGarageButton.wrapper);

            editCentroidButtonES = editCentroidButton.wrapper.GetHTMLElement().style;
            editShapeButtonES = editShapeButton.wrapper.GetHTMLElement().style;
            addGarageButtonES = addGarageButton.wrapper.GetHTMLElement().style;
        }

        viewITPAServiceDataButtonES.display = 'none';
        
        return {
            toolBar: listButtonsWrapper, onTableRowSelect: function (notification) {
                var doShow = !!notification.selected;
                var display = doShow ? 'inline-block' : 'none';
                if (!!editCentroidButtonES) { editCentroidButtonES.display = display; }
                if (!!editShapeButtonES) {editShapeButtonES.display = display; }
                if (!!addGarageButtonES) { addGarageButtonES.display = display; }
                viewITPAServiceDataButtonES.display = display;
            }
        };
    }

    function getSelKeyedItem(listName) {
        var list = lists[listName];
        return !!list ? list.GetSelKeyedItem() : undefined;
    }

    function onViewEventTracker() {
        var btrWindow = window.open("./iocbtr.html", "_blank");
        if (!!btrWindow) {
            btrWindow.focus();
            btrWindow.addEventListener('load', function () { btrWindow.trafficReplay.Initialize({ serverURL: core.GetServerURL(), authForm: core.GetAuthForm() }); }, true);
        }
    }

    function onShowHideBusHistory() {
        var selBus = getSelKeyedItem(ITPA.Core.BusListName);
        if (!!selBus) {
            var key = selBus.GetKey();
            if (busHistory.GetBusIdShowing() == key) { busHistory.Hide(); }
            else { deviceHistory.Hide(); busHistory.Show(key); }
        }
    }

    function onShowHideDeviceHistory() {
        var selDev = getSelKeyedItem(ITPA.Core.DeviceListName);
        if (!!selDev) {
            var key = selDev.GetKey();
            if (deviceHistory.GetDeviceIdShowing() == key) { deviceHistory.Hide(); }
            else { busHistory.Hide(); deviceHistory.Show(key); }
        }
    }

    function showViewStopETAsButton(showBool) { viewStopETAsButtonWrapperES.display = !!showBool ? 'inline-block' : 'none'; }
    function showViewStopLabelButton(showBool) { labelStopButtonWrapperES.display = !!showBool ? 'inline-block' : 'none'; }
    function checkUpdateETAItem(newItem, isBus) {
        if (!!newItem) {
            var etaItem = mapEventHandler.GetETAKeyedItem();
            if (isBus == mapEventHandler.GetETAItemIsBus()) {
                if (etaItem != newItem) { etaItem = newItem; } else { etaItem = undefined; }
            }
            else { etaItem = newItem; }
            mapEventHandler.SetETAKeyedItem(etaItem, isBus);
        }
    }

    function onShowHideBusETAs() { return checkUpdateETAItem(getSelKeyedItem(ITPA.Core.BusListName), true); }
    function onShowHideStopETAs() { return checkUpdateETAItem(getSelKeyedItem(ITPA.Core.PlatformListName), false); }

    function doStartStopTrackingBus(startOnlyIfAlreadyTrackingOne) {
        var selBus = getSelKeyedItem(ITPA.Core.BusListName);
        if (!!selBus) {
            var trackingItem = mapEventHandler.GetTrackBusKeyedItem();
            if ((startOnlyIfAlreadyTrackingOne && trackingItem == undefined) || trackingItem == selBus) { selBus = undefined; }
        }
        mapEventHandler.SetTrackBusKeyedItem(selBus);
    }

    function onStartStopTrackingBus() { doStartStopTrackingBus(false); }

    function onToggleFeatureLabel(keyedItem) {
        if (!!keyedItem) {
            var keyedFeature = oc.GetKeyedFeatureFromKeyedItem(keyedItem);
            var mapFeature = !!keyedFeature ? keyedFeature.GetMapFeature(largeMapFeatureStyleName) : undefined;
            if (!!mapFeature) { keyedFeature.SetIsAlwaysInHover(!mapFeature.GetIsAlwaysInHover()); }
        }
    }

    function onToggleBusLabel() { onToggleFeatureLabel(getSelKeyedItem(ITPA.Core.BusListName)); }
    function onToggleStopLabel() { onToggleFeatureLabel(getSelKeyedItem(ITPA.Core.PlatformListName)); }
    function onToggleDeviceLabel() { onToggleFeatureLabel(getSelKeyedItem(ITPA.Core.DeviceListName)); }

    function onHideFeatureLabels(listName) {
        var list = core.GetList(listName);
        if (!!list) {
            list = list.GetKeyedList();
            if (!!list) {
                var listItems = list.GetKeyedItemList();
                for (var i in listItems) {
                    var keyedFeature = oc.GetKeyedFeatureFromKeyedItem(listItems[i]);
                    if (keyedFeature) { keyedFeature.SetIsAlwaysInHover(false); }
                }
            }
        }
    }

    function onHideAllBusLabels() { onHideFeatureLabels(ITPA.Core.BusListName); }
    function onHideAllStopLabels() { onHideFeatureLabels(ITPA.Core.PlatformListName); }
    function onHideAllDeviceLabels() { onHideFeatureLabels(ITPA.Core.DeviceListName); }

    function openWindow(url) { return window.open(url, null); }

    function openDataWindow(data) {
        if (!!data) {
            var newWindow = window.open(null), doc = newWindow.document;
            doc.write(JSON.stringify(data));
            doc.title = "ITPA Data";
        }
    }

    function openDataWindowSelItem(listName) {
        var selItem = getSelKeyedItem(listName);
        if (!!selItem) { openDataWindow(selItem.GetData()); }
        return false;
    }

    function onViewBusITPAData() { return openDataWindowSelItem(ITPA.Core.BusListName); }

    //openWindow("http://feeds.transloc.com/3/arrivals.json?agencies=571");
    //openWindow(core.GetFullBusesEtasServiceName());

    function onViewBusExternalData() {
        var selBus = getSelKeyedItem(ITPA.Core.BusListName);
        if (!!selBus) {
            var urlToOpen;
            var d = selBus.GetData(), p = d.properties;
            if (p.fleet.toLowerCase() == 'fiu') {
                urlToOpen = "http://feeds.transloc.com/3/vehicle_statuses.json?agencies=571";
            }
            else {
                urlToOpen = "http://www.miamidade.gov/transit/WebServices/Buses/?BusID=" + p.public_transport_vehicle_id;
            }
            openWindow(urlToOpen);
        }
        return false;
    }

    function onViewStopITPAData() { return openDataWindowSelItem(ITPA.Core.PlatformListName); }

    function onViewStopExternalData() {
        var selStop = getSelKeyedItem(ITPA.Core.PlatformListName);
        if (!!selStop) {
            var urlToOpen;
            var d = selStop.GetData(), p = d.properties;
            if (p.fleet.toLowerCase() == 'fiu') {
                urlToOpen = "http://feeds.transloc.com/3/stops.json?include_routes=true&agencies=571";
            }
            else {
                urlToOpen = "http://www.miamidade.gov/transit/WebServices/BusTracker/?StopID=" + p.fleet_id;
            }
            openWindow(urlToOpen);
        }
        return false;
    }

    //function onViewGaragesITPAData() { openWindow(core.GetFullGaragesServiceName()); return false; }
    //function onViewMessagesITPAData() { openWindow(core.GetFullMessagesServiceName()); return false; }
    //function onViewIncidentsITPAData() { openWindow(core.GetFullIncidentsServiceName()); return false; }

    function onViewGaragesITPAData() { return openDataWindowSelItem(ITPA.Core.GarageListName); }
    function onViewMessagesITPAData() { return openDataWindowSelItem(ITPA.Core.MessageListName); }
    function onViewIncidentsITPAData() { return openDataWindowSelItem(ITPA.Core.IncidentListName); }

    function onViewLinesITPAData() {
        if (canAdmin) {
            var selItem = getSelKeyedItem(ITPA.Core.RouteListName);
            if (!!selItem) {
                var data = tf.js.ShallowMerge(selItem.GetData());
                delete data.properties;
                openDataWindow(data);
            }
        }
        else {
            openDataWindowSelItem(ITPA.Core.RouteListName);
        }
    }

    function onViewLinesExternalData() {
        var selItem = getSelKeyedItem(ITPA.Core.RouteListName);
        if (!!selItem) {
            var urlToOpen;
            var d = selItem.GetData(), p = d.properties;
            if (p.fleet.toLowerCase() == 'fiu') {
                urlToOpen = "http://feeds.transloc.com/3/routes.json?agencies=571";
            }
            else {
                urlToOpen = "http://www.miamidade.gov/transit/WebServices/BusRoutes/";
            }
            openWindow(urlToOpen);
        }
        return false;
    }

    function makeBusToolBar() {
        var listButtonsWrapper = makeToolBarWrapper();

        var noLabelBusButton = makeToolBarButton("nolabels-button", onHideAllBusLabels, "Hide All Bus Labels");
        //var noLabelBusButtonWrapperES = noLabelBusButton.wrapper.GetHTMLElement().style;

        var labelBusButton = makeToolBarButton("label-button", onToggleBusLabel, "Show/Hide Bus Label");
        var labelBusButtonWrapperES = labelBusButton.wrapper.GetHTMLElement().style;

        var trackBusButton = makeToolBarButton("track-button", onStartStopTrackingBus, "Start/Stop Tracking Bus");
        var trackBusButtonWrapperES = trackBusButton.wrapper.GetHTMLElement().style;

        var viewBusHistoryButton, viewBusHistoryButtonWrapperES;
        
        if (canAdmin) {
            viewBusHistoryButton = makeToolBarButton("history-button", onShowHideBusHistory, "Show/Hide Bus History");
            viewBusHistoryButtonWrapperES = viewBusHistoryButton.wrapper.GetHTMLElement().style;
            viewBusHistoryButtonWrapperES.display = 'none';
        }

        var viewBusETAsButton = makeToolBarButton("eta-button", onShowHideBusETAs, "Show/Hide Bus ETAs");
        var viewBusETAsButtonWrapperES = viewBusETAsButton.wrapper.GetHTMLElement().style;

        var viewITPAServiceDataButton = makeToolBarButton("download-button", onViewBusITPAData, "View raw ITPA Bus service data");
        var viewITPAServiceDataButtonES = viewITPAServiceDataButton.wrapper.GetHTMLElement().style;

        var viewExternalServiceDataButton = makeToolBarButton("download2-button", onViewBusExternalData, "View raw External Bus service data");
        var viewExternalServiceDataButtonES = viewExternalServiceDataButton.wrapper.GetHTMLElement().style;

        listButtonsWrapper.AddContent(noLabelBusButton.wrapper, labelBusButton.wrapper, trackBusButton.wrapper, viewBusETAsButton.wrapper);

        if (canAdmin) {
            var viewEventTrackerButton = makeToolBarButton("video-button", onViewEventTracker, "Open ITPA Event Tracker");
            listButtonsWrapper.AddContent(viewEventTrackerButton.wrapper, viewBusHistoryButton.wrapper);
        }

        listButtonsWrapper.AddContent(viewITPAServiceDataButton.wrapper, viewExternalServiceDataButton.wrapper);

        trackBusButtonWrapperES.display = labelBusButtonWrapperES.display = viewBusETAsButtonWrapperES.display = 'none';
        viewExternalServiceDataButtonES.display = viewITPAServiceDataButtonES.display = 'none';

        return {
            toolBar: listButtonsWrapper, onTableRowSelect: function (notification) {
                var doShow = !!notification.selected;
                var displayStr = doShow ? 'inline-block' : 'none';
                if (!!viewBusHistoryButtonWrapperES) { viewBusHistoryButtonWrapperES.display = displayStr; }
                labelBusButtonWrapperES.display = trackBusButtonWrapperES.display = viewBusETAsButtonWrapperES.display = viewExternalServiceDataButtonES.display = viewITPAServiceDataButtonES.display = displayStr;
            }
        };
    }

    function makePlatformToolBar() {
        var listButtonsWrapper = makeToolBarWrapper();

        noLabelStopButton = makeToolBarButton("nolabels-button", onHideAllStopLabels, "Hide All Stop Labels");
        noLabelStopButtonWrapperES = noLabelStopButton.wrapper.GetHTMLElement().style;

        labelStopButton = makeToolBarButton("label-button", onToggleStopLabel, "Show/Hide Stop Label");
        labelStopButtonWrapperES = labelStopButton.wrapper.GetHTMLElement().style;

        viewStopETAsButton = makeToolBarButton("eta-button", onShowHideStopETAs, "Show/Hide Stop ETAs");
        viewStopETAsButtonWrapperES = viewStopETAsButton.wrapper.GetHTMLElement().style;

        listButtonsWrapper.AddContent(noLabelStopButton.wrapper, labelStopButton.wrapper, viewStopETAsButton.wrapper);

        if (canAdmin) {
            var editRouteStopsButton = makeToolBarButton("pencil-button", onEditRouteStops, "Show/Hide Route Stops Editor");
            var editRouteStopsButtonES = editRouteStopsButton.wrapper.GetHTMLElement().style;
            listButtonsWrapper.AddContent(editRouteStopsButton.wrapper);
        }

        var viewITPAServiceDataButton = makeToolBarButton("download-button", onViewStopITPAData, "View raw ITPA Stop service data");
        var viewITPAServiceDataButtonES = viewITPAServiceDataButton.wrapper.GetHTMLElement().style;

        var viewExternalServiceDataButton = makeToolBarButton("download2-button", onViewStopExternalData, "View raw External Stop service data");
        var viewExternalServiceDataButtonES = viewExternalServiceDataButton.wrapper.GetHTMLElement().style;

        listButtonsWrapper.AddContent(viewITPAServiceDataButton.wrapper, viewExternalServiceDataButton.wrapper);

        showViewStopETAsButton(false);
        showViewStopLabelButton(false);
        viewExternalServiceDataButtonES.display = 'none';
        viewITPAServiceDataButtonES.display = 'none';


        return {
            toolBar: listButtonsWrapper, onTableRowSelect: function (notification) {
                var doShow = !!notification.selected;
                var displayStr = doShow ? 'inline-block' : 'none';
                showViewStopETAsButton(doShow);
                showViewStopLabelButton(doShow);
                viewExternalServiceDataButtonES.display = displayStr;
                viewITPAServiceDataButtonES.display = displayStr;
            }
        };
    }

    function makeDeviceToolBar() {
        var listButtonsWrapper = makeToolBarWrapper();

        var noLabelDeviceButton = makeToolBarButton("nolabels-button", onHideAllDeviceLabels, "Hidel All Device Labels");
        var noLabelDeviceButtonWrapperES = noLabelDeviceButton.wrapper.GetHTMLElement().style;

        var labelDeviceButton = makeToolBarButton("label-button", onToggleDeviceLabel, "Show/Hide Device Label");
        var labelDeviceButtonWrapperES = labelDeviceButton.wrapper.GetHTMLElement().style;

        var viewDeviceHistoryButton, viewDeviceHistoryButtonWrapperES;

        if (canAdmin) {
            viewDeviceHistoryButton = makeToolBarButton("history-button", onShowHideDeviceHistory, "Show/Hide Device History");
            viewDeviceHistoryButtonWrapperES = viewDeviceHistoryButton.wrapper.GetHTMLElement().style;
            viewDeviceHistoryButtonWrapperES.display = 'none';
        }

        listButtonsWrapper.AddContent(noLabelDeviceButton.wrapper, labelDeviceButton.wrapper);

        if (canAdmin) {
            var viewEventTrackerButton = makeToolBarButton("video-button", onViewEventTracker, "Open ITPA Event Tracker");
            listButtonsWrapper.AddContent(viewEventTrackerButton.wrapper, viewDeviceHistoryButton.wrapper);
        }

        labelDeviceButtonWrapperES.display = 'none';
        return {
            toolBar: listButtonsWrapper, onTableRowSelect: function (notification) {
                var doShow = !!notification.selected;
                var displayStr = doShow ? 'inline-block' : 'none';
                labelDeviceButtonWrapperES.display = displayStr;
                if (viewDeviceHistoryButtonWrapperES) { viewDeviceHistoryButtonWrapperES.display = displayStr; }
            }
        };
    }

    function createToolBars() {
        toolbarWrapper = new tf.dom.Div({ cssClass: "listToolbarWrapper" });
        listLayoutToolbarTab.AddContent(toolbarWrapper);

        toolBars = {};
        toolBars[ITPA.Core.MessageListName] = makeMessagesToolBar();
        toolBars[ITPA.Core.IncidentListName] = makeIncidentsToolBar();
        toolBars[ITPA.Core.GarageListName] = makeGaragesToolBar();
        toolBars[ITPA.Core.NotificationListName] = makeNotificationToolBar();
        toolBars[ITPA.Core.BusListName] = makeBusToolBar();
        toolBars[ITPA.Core.DeviceListName] = makeDeviceToolBar();
        toolBars[ITPA.Core.PlatformListName] = makePlatformToolBar();
        toolBars[ITPA.Core.RouteListName] = makeRoutesToolBar();
    }

    function showControl(element, showBool) { styles.ChangeOpacityVisibilityClass(element, showBool); }

    function createMapEditingControls() {
        (mapEditingControl = new tf.dom.Div({ cssClass: "baseMapEditingControl mapEditingControl" })).AppendTo(map.GetMapMapContainer());
        showControl(mapEditingControl, false);
        garageCentroidEditor = new ITPA.OC.GarageCentroidEditor({ tables: theThis, onNotify: onMapEditorNotify });
        garageShapeEditor = new ITPA.OC.GarageShapeEditor({ tables: theThis, onNotify: onMapEditorNotify });
    }

    var modifiedLinesIds;

    function isModifiedLine(keyedItem) {
        var key = !!keyedItem ? keyedItem.GetKey() : undefined;
        return modifiedLinesIds[key] != undefined;
    }

    function doAddModifiedLine(keyedItem) {
        if (!!keyedItem && !isModifiedLine(keyedItem)) {
            var extLineItem = extLineLoader.GetExtLineItemForITPALineItem(keyedItem);
            if (!!extLineItem) {
                var extData = extLineItem.GetData();
                modifiedLines.push({ itpaItem: keyedItem, xd: extData });
                modifiedLinesIds[keyedItem.GetKey()] = keyedItem;
            }
        }
    }

    function initModifiedLineIds() { modifiedLinesIds = {}; for (var i in modifiedLines) { var ml = modifiedLines[i]; modifiedLinesIds[ml.itpaItem.GetKey()] = ml.itpaItem; } }

    function checkUpdateLinesListResults() {
        if (extLineLoadersStartedRefresh) {
            if (!(extLineLoader.GetIsRefreshing() || extLineShapeLoader.GetIsRefreshing())) {
                //console.log('merge shape changes: ' + shapeChangedLines.length);

                initModifiedLineIds();

                for (var i in shapeChangedLines) { doAddModifiedLine(shapeChangedLines[i]); }

                extLineLoadersStartedRefresh = false;
                linesKeyedList.NotifyItemsUpdated();
                checkShowLinesUpdateButton();
            }
        }
    }

    function onLineShapeLoaderRefreshed() {
        //console.log('ext line shape loader refreshed');
        var ITPAItemList = linesKeyedList.GetKeyedItemList();
        var extLineKeyedList = extLineLoader.GetExtLineKeyedList();
        var extItemList = extLineKeyedList.GetKeyedItemList();
        var fiuLinesMap = {};

        for (var i in ITPAItemList) {
            var itpaItem = ITPAItemList[i], d = itpaItem.GetData(), p = d.properties;
            var extLineShapeItem = extLineShapeLoader.GetShapesForITPALineItem(itpaItem);

            if (!!extLineShapeItem) {
                var extData = extLineShapeItem.GetData();

                if (extData.changedShape) {
                    shapeChangedLines.push(itpaItem);
                }
            }
        }

        checkUpdateLinesListResults();
    }

    function evaluateRefreshedLines() {
        var showUpdateButton = false;

        if (!!extLineLoader && !extLineLoader.GetIsRefreshing()) {
            var ITPAItemList = linesKeyedList.GetKeyedItemList();
            var extLineKeyedList = extLineLoader.GetExtLineKeyedList();
            var extItemList = extLineKeyedList.GetKeyedItemList();
            var fiuLinesMap = {};

            for (var i in ITPAItemList) {
                var itpaItem = ITPAItemList[i], d = itpaItem.GetData(), p = d.properties;
                var extLineItem = extLineLoader.GetExtLineItemForITPALineItem(itpaItem);
                var innerHTML = "";

                p.lineAttrBkColor = colorLineAttrBkNormal;

                if (p.fleet.toLowerCase() == 'fiu') {
                    fiuLinesMap[extLineLoader.GetExtLineKeyForITPALineItem(itpaItem)] = itpaItem;
                }

                if (!!extLineItem) {
                    var extData = extLineItem.GetData();
                    var changed = false;

                    if (p.identifier != extData.identifier) {
                        changed = true;
                        innerHTML += 'Name changed: "<b>' + p.identifier + '</b>" to "<b>' + extData.identifier + '</b>"<br />';
                    }
                    if (p.color != extData.color) {
                        changed = true;
                        innerHTML += 'Color changed: <b>' + p.color + '</b> to <b>' + extData.color + '</b><br />';
                    }

                    if (!changed) {
                        innerHTML += 'Attributes are current<br />';
                        p.lineAttrBkColor = colorLineAttrBkCurrent;
                    }
                    else {
                        modifiedLines.push({ itpaItem: itpaItem, xd: extData });
                    }
                }
                else {
                    innerHTML += 'Failed to retrieve Attributes from external service<br />';
                }
                p.lineInnerHTML = innerHTML;
            }

            for (var i in extItemList) {
                var extItem = extItemList[i], xd = extItem.GetData();
                if (xd.fleet.toLowerCase() == 'fiu') {
                    if (!fiuLinesMap[xd.extLineKey]) {
                        newFIULines.push({ xd: xd });
                    }
                }
            }

            var newLinesLen = newFIULines.length;
            var modifiedLinesLen = modifiedLines.length;

            showUpdateButton = newLinesLen > 0 || modifiedLinesLen > 0;

            if (showUpdateButton) {
                //console.log('detected new FIU lines: ' + newFIULines.length);
                //console.log(JSON.stringify(newFIULines));
                var results = "";

                if (newLinesLen > 0) {
                    results += newLinesLen + " new FIU lines detected:<br /><br />";
                    for (var i = 0 ; i < newLinesLen ; ++i) {
                        var d = newFIULines[i].xd;
                        var str = d.fleet_id + ' ' + d.identifier + '<br />';
                        results += str;
                    }
                }
                if (modifiedLinesLen > 0) {
                    if (newLinesLen > 0) { results += '<br />'; }
                    results += modifiedLinesLen + " bus lines need update<br />";
                }
                appLayout.ToastText({ text: results, timeout: 8000 });
            }
        }
        else {
            for (var i in ITPAItemList) {
                var itpaItem = ITPAItemList[i], d = itpaItem.GetData(), p = d.properties;
                p.lineInnerHTML = lineAttributesOngoingStr;
                p.lineAttrBkColor = colorLineAttrBkNormal;
            }
        }

        checkShowLinesUpdateButton();
    }

    function onLineLoaderRefreshed() {
        //console.log('ext line loader refreshed');
        evaluateRefreshedLines();
        checkUpdateLinesListResults();
    }

    function onLinesListRefresh(notification) {
        if (!extLineLoadersStartedRefresh && !!extLineLoader && !!extLineShapeLoader) {
            extLineLoadersStartedRefresh = true;
            newFIULines = [];
            modifiedLines = [];
            shapeChangedLines = [];
            shapeEditedLines = {};
            extLineLoader.Refresh();
            extLineShapeLoader.Refresh();
            checkShowLinesUpdateButton();
        }
    }

    function onEditRouteShape() {
        var selItem = getSelKeyedItem(ITPA.Core.RouteListName);
        if (!!selItem) {
            var d = selItem.GetData(), p = d.properties;
            var title = 'Editing: ' + p.fleet.toUpperCase() + ' ' + p.fleet_id + ' - ' + p.identifier + ' (' + p.direction + ')';
            routeShapeEditor.Edit({
                title: title,
                mlsGeom: d.largeGeometry,
                mlsSmallGeom: d.geometry,
                props: {
                    keyedItem: selItem
                }
            });
        }
    }

    function onCloseRouteShapeEditor(notification) {
        if (notification.isConfirmed) {
            var keyedItem = notification.props.keyedItem;
            var d = keyedItem.GetData(), p = d.properties;
            p.geometry = notification.geom;
            p.shape_sm_c = JSON.stringify(polyCode.EncodeMultiLineString(p.geometry.coordinates, 7));
            shapeEditedLines[keyedItem.GetKey()] = keyedItem;
            keyedItem.NotifyUpdated();
            doAddModifiedLine(keyedItem);
            checkShowLinesUpdateButton();
        }
    }

    var pkRecommendationsList, pkRecommendationsKeyedList;
    var pkLastEventList, pkLastEventKeyedList;

    function showPkRecommendations(garItem) {
        if (!!garItem) {
            var divPkRecommendations = garItem.divPkRecommendations;
            
            if (!!divPkRecommendations) {
                var divPkRecommendationsE = divPkRecommendations.GetHTMLElement(), divPkRecommendationsES = divPkRecommendationsE.style;
                var hasRecommendations = false;
                var decalMap = pkRecommendationsList.GetDecalMap();

                divPkRecommendations.ClearContent();

                if (!!decalMap) {
                    var garItemData = garItem.GetData();
                    var pkRec = garItemData.pkRecommendations;
                    var recDecals = !!pkRec ? pkRec.decals : undefined;

                    hasRecommendations = !!recDecals;

                    if (hasRecommendations) {
                        var allHTML = "";
                        for (var i in recDecals) {
                            var r = recDecals[i];
                            var decal = decalMap[r.id + ''];
                            if (!!decal) {
                                var area = r.area;
                                var recStr = decal.name + ': ';
                                var toolTip = decal.description;
                                if (!!area) {
                                    recStr += area.label + area.level.level;
                                }
                                else {
                                    recStr += 'none';
                                }

                                //console.log('pkrec ' + garItemData.properties.parking_site_id + ' :' + recStr);

                                var thisHTML = '<span class="pkRec-span" title="' + toolTip + '">' + recStr + '</span> ';

                                allHTML += thisHTML;
                            }
                        }
                        divPkRecommendationsE.innerHTML = allHTML;
                    }
                }

                divPkRecommendationsES.display = hasRecommendations ? "block" : "none";
            }
        }
    }

    function onPkRecChanged(notification) {
        var recItems = notification.items;
        for (var i in recItems) {
            var recItem = recItems[i], recItemData = recItem.GetData();
            var garItem = recItemData.garItem;
            showPkRecommendations(garItem);
        }
    }

    function getPkEventHTML(entryOrExitEvent, decalMap) {
        var htmlStr;
        if (!!entryOrExitEvent) {
            var decalName = decalMap[entryOrExitEvent.decalId + ''];
            if (!!decalName) {
                var entryExitStr = entryOrExitEvent.isEntry ? "entry" : "exit";
                var hourStr = tf.js.GetAMPMHourWithSeconds(entryOrExitEvent.date);
                var toolTip = "Last " + entryExitStr + " at " + tf.js.GetMonthDayYearStr(entryOrExitEvent.date) + " " + hourStr;
                var htmlStr = '<span class="pkEv-span" title="' + toolTip + '">' + entryExitStr + ": " + hourStr + "-" + decalName.name + "-" + entryOrExitEvent.vehicleId + "-" + entryOrExitEvent.laneDesc;
                htmlStr += '</span>' + "<br/>";
            }
        }
        return htmlStr;
    }

    function showPkEvents(garItem) {
        if (!!pkRecommendationsList) {
            if (!!garItem) {
                var divPkEvents = garItem.divPkEvents;

                if (!!divPkEvents) {
                    var divPkEventsE = divPkEvents.GetHTMLElement(), divPkEventsES = divPkEventsE.style;
                    var hasEvents = false;
                    var decalMap = pkRecommendationsList.GetDecalMap();

                    divPkEvents.ClearContent();

                    if (!!decalMap) {
                        var garItemData = garItem.GetData();
                        var pkEvents = garItemData.pkEvents;

                        if (!!pkEvents) {
                            var entryEvent = pkEvents.entryEvent;
                            var exitEvent = pkEvents.exitEvent;

                            hasEvents = !!entryEvent || !!exitEvent;

                            if (hasEvents) {
                                var allHTML = "";
                                var htmlEntry = getPkEventHTML(entryEvent, decalMap);
                                var htmlExit = getPkEventHTML(exitEvent, decalMap);
                                if (htmlEntry != undefined) { allHTML += htmlEntry; }
                                if (htmlExit != undefined) { allHTML += htmlExit; }
                                if (hasEvents = (allHTML.length > 0)) {
                                    divPkEventsE.innerHTML = allHTML;
                                }
                            }
                        }
                    }

                    divPkEventsES.display = hasEvents ? "block" : "none";
                }
            }
        }
    }

    function onPkEvChanged(notification) {
        var items = notification.items;
        for (var i in items) {
            var item = items[i], itemData = item.GetData();
            var garItem = itemData.garItem;
            showPkEvents(garItem);
        }
    }

    function initialize() {
        styles = tf.GetStyles();
        statusButtonEnabledClasses = styles.CreateTextDivBtnClasses("white", "green", "white", "darkgreen");
        statusButtonDisabledClasses = styles.CreateTextDivBtnClasses("white", "red", "white", "darkred");

        //statusButtonSelectedClasses = styles.CreateTextDivBtnClasses("white", "blue", "white", "darkblue");
        //statusButtonUnSelectedClasses = styles.CreateTextDivBtnClasses("white", "lightblue", "white", "navyblue");

        statusButtonSelectedClasses = styles.CreateTextDivBtnClasses("white", "#003377", "white", "blue");
        statusButtonUnSelectedClasses = styles.CreateTextDivBtnClasses("white", "lightblue", "white", "#003377");

        colorLineAttrBkNormal = "navajowhite";
        colorLineAttrBkCurrent = "#c0ff00";

        lineAttributesOngoingStr = 'Attributes review is ongoing<br />';

        fiuFleetOrder = 0;
        mdtFleetOrder = 1 - fiuFleetOrder;

        isSubmittingLinesUpdate = false;

        newFIULines = [];
        modifiedLines = [];
        shapeEditedLines = {};
        shapeChangedLines = [];
        modifiedLinesIds = {};

        oc = settings.oc;
        appStyles = oc.GetAppStyles();
        largeMapFeatureStyleName = appStyles.LargeMapFeatureStyleName;
        core = oc.GetCore();
        canAdmin = core.GetCanAdmin();
        etaList = core.GetETAList();
        maps = oc.GetMaps();
        map = maps.GetLargeMap();

        if (!!(pkRecommendationsList = core.GetPkRecommendationList())) {
            pkRecommendationsKeyedList = pkRecommendationsList.GetKeyedList();
            var pkListeners = {};
            pkListeners[tf.consts.keyedListAddedItemsEvent] = onPkRecChanged;
            pkListeners[tf.consts.keyedListUpdatedItemsEvent] = onPkRecChanged;
            pkListeners[tf.consts.keyedListDeletedItemsEvent] = onPkRecChanged;
            pkRecommendationsKeyedList.AddListeners(pkListeners);
            pkRecommendationsKeyedList.NotifyItemsAdded(onPkRecChanged);
        }

        if (!!(pkLastEventList = core.GetPkLastEventList())) {
            pkLastEventKeyedList = pkLastEventList.GetKeyedList();
            var pkListeners2 = {};
            pkListeners2[tf.consts.keyedListAddedItemsEvent] = onPkEvChanged;
            pkListeners2[tf.consts.keyedListUpdatedItemsEvent] = onPkEvChanged;
            pkListeners2[tf.consts.keyedListDeletedItemsEvent] = onPkEvChanged;
            pkLastEventKeyedList.AddListeners(pkListeners);
            pkLastEventKeyedList.NotifyItemsAdded(onPkEvChanged);
        }

        createMapEditingControls();

        polyCode = new tf.map.PolyCode();
        inPlaceTextAreaSingleLine = new ITPA.OC.InPlaceTextArea({ oc: oc, onClose: onInPlaceEditClose, singleLine: true, noFocusOut: false, revertOnFocusOut: true });
        linesList = core.GetRouteList();
        linesList.AddPreRefreshListener(onLinesListRefresh);
        linesKeyedList = linesList.GetKeyedList();
        coreFeatureLists = oc.GetCoreFeatureLists();
        garageList = core.GetGarageList();
        occupancyList = core.GetOccupancyList();
        occupancyKeyedList = occupancyList ? occupancyList.GetKeyedList() : undefined;

        if (busList = core.GetBusList()) { busKeyedList = busList.GetKeyedList(); }

        appLayout = oc.GetAppLayout();
        listLayoutToolbarTab = appLayout.GetListLayoutToolbarTab();
        listLayoutDiv = appLayout.GetListLayoutDiv();
        lineDirections = ITPA.Core.MakeLineDirectionAbreviations();
        createHeader();
        createToolBars();
        if (canAdmin) {
            extLineLoader = new ITPA.OC.ExtLineLoader({ oc: oc, onRefresh: onLineLoaderRefreshed });
            extLineShapeLoader = new ITPA.OC.ExtLineShapeLoader({ serviceURL: core.GetFullRoutesLargeCompressedServiceName(), onRefresh: onLineShapeLoaderRefreshed });
            extLineLoadersStartedRefresh = true;
            routeShapeEditor = new tf.map.FullScreenRouteShapeEditor({ editorSettings: { onClose: onCloseRouteShapeEditor } });
            fullScreenBusLineJSON = new ITPA.OC.FullScreenBusLineJSON({ onConfirm: onBusLineJSONConfirm, routesKeyedList: linesKeyedList });
        }
        else {
            extLineLoadersStartedRefresh = false;
        }
        createLists();
        mapEventHandler = oc.GetMapEventHandler();
        if (canAdmin) {
            busHistory = new ITPA.OC.BusHistory({ oc: oc });
            deviceHistory = new ITPA.OC.DeviceHistory({ oc: oc });
        }
        setList(ITPA.Core.BusListName);
        //setList(ITPA.Core.DeviceListName);
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};


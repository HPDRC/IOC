"use strict";

ITPA.OC.NotificationEditor = function (settings) {
    var theThis, topContainer, isShowing, styles, editorWrapper, notificationsList, notificationsKeyedList, table, scrollerDiv, scrollerDivE, scrollerDivES;
    var inPlaceTextArea, datePicker, editedItems, nEditedItems, nExistingItems, nNewItems, nErrorItems, errorItems, toaster, oc, lastNotificationId;
    var statusButtonEnabledClasses, statusButtonDisabledClasses;
    var captionButtonsWrapper, addNewButton, refreshButton, submitButton, updatingServerDiv, updatingServerDivE, updatingServerDivES;
    var selfHideCB;

    this.Show = function (showBool) { return show(showBool); }
    this.GetIsShowing = function () { return isShowing; }
    this.Toggle = function () { return theThis.Show(!theThis.GetIsShowing()); }

    function show(showBool) {
        if (isShowing != (showBool = !!showBool)) {
            doShow(isShowing = showBool);
        }
    }

    function selfHide() { if (selfHideCB) { selfHideCB({ sender: theThis }); } show(false); }

    function doShow(showBool) {
        if (inPlaceTextArea.IsAttached()) { inPlaceTextArea.Detach(); }
        datePicker.Detach();
        styles.ChangeOpacityVisibilityClass(editorWrapper, showBool);
    }

    function goTo(keyedItem) { if (!!keyedItem) { table.GetRowFromKeyedItem(keyedItem).Select(true, true); } }

    function createContentContainer() {
        var contentContainer = new tf.dom.Div();
        var contentContainerStyle = contentContainer.GetHTMLElement().style;

        contentContainerStyle.textAlign = 'left';
        contentContainerStyle.border = "2px solid navy";
        contentContainerStyle.borderRadius = "4px";
        contentContainerStyle.overflow = "hidden";
        return contentContainer;
    }

    var keyedItemBeingEdited, elementBeingEdited, attrBeingEdited;

    function getInPlaceEdit(keyedItem, element, className, attrName) {
        return function () {
            datePicker.Detach();
            if (keyedItemBeingEdited != keyedItem || elementBeingEdited != element) {
                inPlaceTextArea.Detach();
            }
            if (keyedItemBeingEdited == undefined) {
                var props = keyedItem.GetData();

                keyedItemBeingEdited = keyedItem;
                elementBeingEdited = element;

                inPlaceTextArea.SetText(props[attrBeingEdited = attrName]);
                inPlaceTextArea.Attach(element, className);
            }
        }
    }

    function resetEditedItems() {
        editedItems = {}; nEditedItems = 0; nNewItems = 0; nExistingItems = 0;
        nErrorItems = 0; errorItems = {};
    }

    function consistItem(keyedItem, bypassNotify) {
        var key = tf.js.MakeObjectKey(keyedItem.GetKey());
        var consistMsg = "", errorSeparator = ', ';
        var props = keyedItem.GetData();
        var hadError = keyedItem.consistencyResults != undefined;

        if (!props.title) {
            if (consistMsg.length) { consistMsg += errorSeparator; }
            consistMsg += "missing Title";
        }
        if (!props.summary) {
            if (consistMsg.length) { consistMsg += errorSeparator; }
            consistMsg += "missing Summary";
        }
        
        var startDate = props.start_on, endDate = props.expire_on;

        if (!!startDate && !!endDate) {
            if (tf.js.GetDateFromTimeStamp(startDate) >= tf.js.GetDateFromTimeStamp(endDate)) {
                if (consistMsg.length) { consistMsg += errorSeparator; }
                consistMsg += "invalid Date interval";
            }
        }

        consistMsg.trim();

        var hasError = consistMsg.length > 0;

        if (hasError) {
            if (!hadError) {
                errorItems[key] = keyedItem;
                ++nErrorItems;
            }
        }
        else if (hadError) {
            delete errorItems[key];
            --nErrorItems;
        }

        keyedItem.consistencyResults = hasError ? consistMsg  + '.' : undefined;

        if (!bypassNotify) { keyedItem.NotifyUpdated(); }

        //console.log(nErrorItems);
    }

    function updateItem(keyedItem, bypassNotify) {
        var key = tf.js.MakeObjectKey(keyedItem.GetKey());
        if (editedItems[key] == undefined) { editedItems[key] = keyedItem; ++nEditedItems; }
        consistItem(keyedItem, bypassNotify);
    }

    function onInPlaceEditClose(notification) {
        if (keyedItemBeingEdited != undefined) {
            var props = keyedItemBeingEdited.GetData();
            //props[attrBeingEdited] = tf.js.GetIsNonEmptyString(notification.text) ? notification.text : /*"&nbsp;"*/ attrBeingEdited;
            props[attrBeingEdited] = tf.js.GetIsNonEmptyString(notification.text) ? notification.text : undefined;
            updateItem(keyedItemBeingEdited);
            keyedItemBeingEdited = undefined;
            elementBeingEdited = undefined;
            attrBeingEdited = undefined;
        }
    }

    function createDateLabel(text) {
        var label = new tf.dom.Div({ cssClass: "notificationDateLabel" });
        var labelE = label.GetHTMLElement();
        labelE.innerHTML = text;
        return label;
    }

    var lastDateEditKeyedItem, lastDateIsStart;

    function getOnDateButtonClicked(keyedItem, isStart) {
        return function () {
            if (datePicker.IsAttached()) {
                if (lastDateEditKeyedItem == keyedItem && lastDateIsStart == isStart) {
                    datePicker.Detach();
                    return;
                }
                if (lastDateEditKeyedItem != keyedItem || lastDateIsStart != isStart) {
                    datePicker.Detach();
                }
            }

            if (!datePicker.IsAttached()) {
                var dateButton = isStart ? keyedItem.notificationStart : keyedItem.notificationEnd;
                var dateField = isStart ? "start_on" : "expire_on";
                var props = keyedItem.GetData();
                var dateStr = props[dateField];
                var date = tf.js.GetIsNonEmptyString(dateStr) ? tf.js.GetDateFromTimeStamp(dateStr) : new Date();
                datePicker.SetDate(date);

                var dateButtonRect = dateButton.GetHTMLElement().getBoundingClientRect();
                var leftStr = dateButtonRect.left + 'px';
                var topStr = dateButtonRect.bottom + 'px';

                lastDateEditKeyedItem = keyedItem;
                lastDateIsStart = isStart;

                datePicker.AppendTo(topContainer, { position: "absolute", left: leftStr, top: topStr, zIndex: 1 });
            }
            return false;
        }
    }

    function getOnClearDateClicked(keyedItem, isStart) {
        return function () {
            var props = keyedItem.GetData();
            if (isStart) { props.start_on = undefined; }
            else { props.expire_on = undefined; }
            updateItem(keyedItem);
            return false;
        }
    }

    function onDatePickerDateClicked(notification) {
        if (!!lastDateEditKeyedItem) {
            var props = lastDateEditKeyedItem.GetData();
            var propsName = lastDateIsStart ? "start_on" : "expire_on";
            props[propsName] = tf.js.GetTimeStampFromDate(notification.date);
            updateItem(lastDateEditKeyedItem);
            lastDateEditKeyedItem = undefined;
            lastDateIsStart = undefined;
        }
        datePicker.Detach();
    }

    function getOnStatusClicked(keyedItem) {
        return function () {
            var props = keyedItem.GetData();
            props.is_active = !props.is_active;
            updateItem(keyedItem);
            return false;
        }
    }

    function getRowContent(notification) {
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

                divURLAE.title = "Edit Web Site";
                divURLAE.target = "_blank";
                divURLAE.className = "notificationURLA";

                divSummaryE.title = "Edit Summary";
                divIconE.title = "Edit Icon";
                divTitleE.title = "Edit Title";

                divTitleE.placeholder = "Title";

                divSummaryIcon.AddContent(divIcon, divSummary);

                var notificationDatesActiveWrapper = new tf.dom.Div({ cssClass: "notificationDatesActiveWrapper" });

                var statusLabel = createDateLabel("Status");

                var notificationDateStart = createDateLabel("Start");
                var notificationDateEnd = createDateLabel("Expire");

                notificationDateEnd.GetHTMLElement().style.marginLeft = "20px;"

                var buttonDim = "18px", textDim = buttonDim;

                var statusButton = styles.AddButtonDivMargins(new tf.ui.TextBtn({
                    dim: textDim, style: statusButtonEnabledClasses, label: '', tooltip: "Change Status", onClick: getOnStatusClicked(keyedItem)
                }));

                var notificationStart = styles.AddButtonDivMargins(new tf.ui.TextBtn({
                    dim: textDim, style: true, label: '', tooltip: "Edit Start Date", onClick: getOnDateButtonClicked(keyedItem, true)
                }));

                notificationStart.GetHTMLElement().style.display = 'inline-block';

                var notificationEnd = styles.AddButtonDivMargins(new tf.ui.TextBtn({
                    dim: textDim, style: true, label: '', tooltip: "Edit Expiration Date", onClick: getOnDateButtonClicked(keyedItem, false)
                }));

                notificationEnd.GetHTMLElement().style.display = 'inline-block';

                var clearStart = styles.AddButtonDivRightMargin(new tf.ui.TextBtn({
                    style: true, label: styles.GetUnicodeXClose(), onClick: getOnClearDateClicked(keyedItem, true), tooltip: "Set Start Date to Always", dim: buttonDim
                }));
                var clearEnd = styles.AddButtonDivRightMargin(new tf.ui.TextBtn({
                    style: true, label: styles.GetUnicodeXClose(), onClick: getOnClearDateClicked(keyedItem, false), tooltip: "Set Expiration Date to Never", dim: buttonDim
                }));

                notificationDatesActiveWrapper.AddContent(statusLabel, statusButton, notificationDateStart, notificationStart, clearStart, notificationDateEnd, notificationEnd, clearEnd);

                var notificationsConsistencyResults = new tf.dom.Div({ cssClass: "notificationsConsistencyResults" });
                var notificationsConsistencyResultsE = notificationsConsistencyResults.GetHTMLElement();


                notificationsConsistencyResultsE.title = "Fix These Errors Before Submitting";

                divWrapper.AddContent(divTitle, divSummaryIcon, divURLAE, notificationDatesActiveWrapper, notificationsConsistencyResults);
                content.AddContent(divWrapper);

                keyedItem.listContent = content;
                keyedItem.divTitleE = divTitleE;
                keyedItem.divIconE = divIconE;
                keyedItem.divSummaryE = divSummaryE;
                keyedItem.divURLAE = divURLAE;
                keyedItem.notificationStart = notificationStart;
                keyedItem.notificationEnd = notificationEnd;
                keyedItem.statusButton = statusButton;

                keyedItem.divTitleE.addEventListener('click', getInPlaceEdit(keyedItem, keyedItem.divTitleE, "notificationTitleDiv", "title"));
                keyedItem.divSummaryE.addEventListener('click', getInPlaceEdit(keyedItem, keyedItem.divSummaryE, "notificationSummaryDiv", "summary"));
                keyedItem.divIconE.addEventListener('click', getInPlaceEdit(keyedItem, keyedItem.divIconE, "notificationIconEdit", "icon"));
                keyedItem.divURLAE.addEventListener('click', getInPlaceEdit(keyedItem, keyedItem.divURLAE, "notificationURLA", "url"));

                keyedItem.clearStart = clearStart;
                keyedItem.clearEnd = clearEnd;

                keyedItem.notificationsConsistencyResultsE = notificationsConsistencyResultsE;

                keyedItem.consistencyResults = undefined;
                //keyedItem.consistencyResults = "no errors";
            }

            if (!!props.icon) {
                keyedItem.divIconE.innerHTML = "<img class='notificationIconImg' src='" + props.icon + "' />";
            }
            else {
                keyedItem.divIconE.innerHTML = "<p>icon</p>";
            }

            keyedItem.divURLAE.style.display = 'block';
            keyedItem.divURLAE.innerHTML = !!props.url ? props.url: "url";

            keyedItem.id = props.notification_id;
            keyedItem.divTitleE.innerHTML = props.title != undefined ? props.title : "title";
            keyedItem.divSummaryE.innerHTML = props.summary != undefined ? props.summary : "summary";

            var hasStart = !!props.start_on;
            var startOnText = hasStart ? tf.js.GetMonthDayYearStr(tf.js.GetDateFromTimeStamp(props.start_on)) : "always";

            keyedItem.notificationStart.SetText(startOnText);
            keyedItem.clearStart.GetHTMLElement().style.display = (hasStart ? 'inline-block' : 'none');

            var hasEnd = !!props.expire_on;
            var endOnText = hasEnd ? tf.js.GetMonthDayYearStr(tf.js.GetDateFromTimeStamp(props.expire_on)) : "never";

            keyedItem.notificationEnd.SetText(endOnText);
            keyedItem.clearEnd.GetHTMLElement().style.display = (hasEnd ? 'inline-block' : 'none');

            keyedItem.statusButton.SetText(props.is_active ? 'enabled' : 'disabled');
            keyedItem.statusButton.SetStyle(props.is_active ? statusButtonEnabledClasses : statusButtonDisabledClasses);

            var hasConsistencyResults = keyedItem.consistencyResults != undefined;

            if (hasConsistencyResults) {
                keyedItem.notificationsConsistencyResultsE.style.display = 'block';
                keyedItem.notificationsConsistencyResultsE.innerHTML = keyedItem.consistencyResults;
            }
            else {
                keyedItem.notificationsConsistencyResultsE.style.display = 'none';
            }

        }
        return { sender: theThis, content: content };
    }

    function addNew() {
        ++nNewItems;
        var newNotificationData = {
            summary: undefined,
            title: undefined,
            url: undefined,
            icon: undefined,
            is_active: true,
            class_id: 1,
            notification_id: lastNotificationId + nNewItems
        }
        var keyedItem = notificationsKeyedList.AddOrGetItem(newNotificationData);
        updateItem(keyedItem, false);
        goTo(keyedItem);
    }

    function showInterfaceItems(showBool) {
        scrollerDivES.display = showBool ? 'block' : 'none';
        captionButtonsWrapper.GetHTMLElement().style.display = showBool ? 'inline-block' : 'none';
        updatingServerDivES.display = showBool ? 'none' : 'block';
    }

    function onEndSubmit(nErrors) {
        notificationsList.RefreshNow();
        showInterfaceItems(true);
        refresh();
        var toastText = nErrors > 0 ? 'Submit: Completed with ' + nErrors + ' errors' : 'Submit: Success';
        toaster.Toast({ text: toastText });
    }

    function submit() {
        if (nEditedItems > 0) {
            if (nErrorItems > 0) {
                toaster.Toast({ text: "Submit failed: Some messages have errors." });
            }
            else {
                var itemsToSend = editedItems;
                var nItemsToSend = nEditedItems;
                var nRepliedItems = 0;
                var nErrors = 0;

                resetEditedItems();
                showInterfaceItems(false);

                for (var i in itemsToSend) {
                    var notificationRecord = itemsToSend[i].GetData();
                    if (notificationRecord.notification_id > lastNotificationId) { notificationRecord.notification_id = 0; }
                    notificationsList.Add(notificationRecord, function (data) {
                        if (!data || !data.status) { ++nErrors; }
                        if (++nRepliedItems == nItemsToSend) {
                            setTimeout(function () { return onEndSubmit(nErrors); }, 250);
                        }
                    });
                }
            }
        }
        else {
            toaster.Toast({ text: "Submit: No changes." });
        }
    }

    function refresh() {
        resetEditedItems();
        notificationsList.GetList(function (data) {
            if (!!data) {
                resetEditedItems();
                nExistingItems = data.length;
                notificationsKeyedList.UpdateFromNewData(data);
                if (nExistingItems > 0) { lastNotificationId = data[nExistingItems - 1].notification_id; }
            }
            else {
                nEditedItems = 0;
                toaster.Toast({ text: "Refresh: Failed to retrieve messages from server" });
            }
        });
    }

    function sortNotificationRows(ra, rb) {
        var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
        return kib.id - kia.id;
    }

    function createTable() {
        var tableSettings = settings.tableSettings, tableRowStyle = settings.tableRowStyle, tableRowHoverStyle = settings.tableRowHoverStyle;
        var rowSettings = { style: tableRowStyle, selectedStyle: tableRowHoverStyle };

        notificationsKeyedList = new tf.js.KeyedList({
            name: "notifications",
            getKeyFromItemData: function (data) { return !!data ? data.notification_id : undefined },
            filterAddItem: function (itemData) { return true; },
            needsUpdateItemData: function (updateObj) { return true; }
        });

        var tableCreateSettings = {
            keyedList: notificationsKeyedList, optionalScope: theThis, tableSettings: tableSettings, rowSettings: rowSettings,
            properties: {}, getRowContent: getRowContent
        };
        table = new tf.ui.KeyedTable(tableCreateSettings);
        table.SetSort(sortNotificationRows);
        scrollerDiv = new tf.dom.Div({ cssClass: "tableScrollerDiv" });
        scrollerDiv.AddContent(table);
        scrollerDivE = scrollerDiv.GetHTMLElement();
        scrollerDivES = scrollerDivE.style;
        scrollerDivES.display = 'block';
        scrollerDivES.height = "calc(100% - 36px)";
    }

    function createEditor() {

        statusButtonEnabledClasses = styles.CreateTextDivBtnClasses("white", "green", "white", "darkgreen");
        statusButtonDisabledClasses = styles.CreateTextDivBtnClasses("white", "red", "white", "darkred");

        resetEditedItems();

        topContainer = oc.GetAppLayout().GetTopLayout().GetContainer();

        inPlaceTextArea = new ITPA.OC.InPlaceTextArea({ oc: oc, onClose: onInPlaceEditClose, singleLine: false });
        datePicker = new tf.ui.DatePicker({
            onClick: onDatePickerDateClicked
            //, weekDayLetters: ['00', '01', '02', '03', '04', '05', '06'], monthNames: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'], buttonDim: "20px"
        });

        var buttonDim = "18px";

        editorWrapper = new tf.dom.Div({ cssClass: "floatEditorWrapper notificationsEditorWrapper" });

        var notificationsEditorTitleWrapper = new tf.dom.Div({ cssClass: "floatEditorTitleWrapper" });

        var hideButton = styles.AddButtonDivLeftRightMargins(
            new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphCloseXName, onClick: selfHide, tooltip: "Hide ITPA Messages Editor", dim: buttonDim })
        );

        var notificationsEditorTitle = new tf.dom.Div({ cssClass: "floatEditorTitle" });
        var notificationsEditorTitleE = notificationsEditorTitle.GetHTMLElement();

        notificationsEditorTitleE.innerHTML = "ITPA Messages Editor";

        captionButtonsWrapper = new tf.dom.Div({ cssClass: "floatRightButtonsWrapper" });

        var buttonDim2 = "20px";

        addNewButton = styles.AddButtonDivMargins(
            new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphPlusSignName, onClick: addNew, tooltip: "Add New Message", dim: buttonDim2 })
        );

        refreshButton = styles.AddButtonDivMargins(
            new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphUndoName, onClick: refresh, tooltip: "Discard Changes and Refresh List", dim: buttonDim2 })
        );

        submitButton = styles.AddButtonDivMargins(
            new tf.ui.SvgGlyphBtn({ style: true, glyph: tf.styles.SvgGlyphUndoName, onClick: submit, tooltip: "Submit Changes and Refresh List", dim: buttonDim2 })
        );

        addNewButton.GetHTMLElement().style.marginRight = "16px";
        refreshButton.GetHTMLElement().style.marginRight = "16px";
        tf.dom.AddCSSClass(submitButton, "flipHV");

        captionButtonsWrapper.AddContent(addNewButton, refreshButton, submitButton);

        notificationsEditorTitleWrapper.AddContent(hideButton, notificationsEditorTitle, captionButtonsWrapper);

        createTable();

        updatingServerDiv = new tf.dom.Div({ cssClass: "notificationsConsistencyResults" });
        updatingServerDivE = updatingServerDiv.GetHTMLElement();
        updatingServerDivES = updatingServerDivE.style;
        styles.ApplySnapToCenterStyle(updatingServerDiv);
        updatingServerDivE.innerHTML = "Updating Server ...";
        updatingServerDivES.display = 'none';
        updatingServerDivES.position = 'absolute';

        editorWrapper.AddContent(notificationsEditorTitleWrapper, scrollerDiv, updatingServerDiv);

        topContainer.AddContent(editorWrapper);

        //var toasterStyle = { zIndex: 2, position: "absolute", right: "0px", top: "0px", boxShadow: "-3px 3px 6px rgba(0,0,0,0.5)" };
        //toaster = new tf.ui.Toaster({ container: scrollerDiv, timeout: 3000, className: "notificationsConsistencyResults", style: toasterStyle });

        var toasterStyle = { zIndex: 20, position: "absolute", right: "0px", top: "0px" };
        toaster = new tf.ui.Toaster({
            container: scrollerDiv, timeout: 2000, className: "", style: toasterStyle, toastClassName: "notificationsConsistencyResults", toastStyle: {
                display: "block", margin: "6px", boxShadow: "3px 3px 6px rgba(0,0,0,0.5)"
            }, addBefore: true
        });


        doShow(false);

        refresh();
    }

    function initialize() {
        styles = tf.GetStyles();
        oc = settings.oc;
        selfHideCB = tf.js.GetFunctionOrNull(settings.onSelfHide);
        notificationsList = oc.GetCore().GetList(ITPA.Core.NotificationListName);
        createEditor();

        /*var testAdd = { notification_id: 0, class_id: 2, title: '!?hello2,', summary: 'world2!?!', is_active: true, url: "http://cs.fiu.edu" };
        notificationsList.Add(testAdd, function (data) {
            console.log(JSON.stringify(data));
        });*/
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};

"use strict";

ITPA.OC.LiveFeeds = function (settings) {
    var theThis, styles, liveFeedsTable, topDiv, core, coreBusFeedList, coreBusFeedKeyedList, coreBusFeedService, startSettings, buttonsWrapperHeight;
    var selectedFeed;
    var canPlay;
    var playingHTML;

    this.Start = function (startSettingsSet) { startSettings = startSettingsSet; core = startSettings.core; start(); }
    this.GetTopDiv = function () { return topDiv; }
    this.Play = function () { canPlay = true; return checkStartStopPlay(); }
    this.Stop = function () { canPlay = false; return checkStartStopPlay(); }

    function checkStartStopPlay() {
        if (canPlay) {
            if (selectedFeed) {
                if (playingHTML == undefined) {
                    selectedFeed.videoDiv.GetHTMLElement().innerHTML = playingHTML = getPlayVideoHTML(selectedFeed);
                }
            }
        }
        else {
            if (selectedFeed) {
                if (playingHTML !== undefined) {
                    selectedFeed.videoDiv.ClearContent();
                    playingHTML = undefined;
                }
            }
        }
    };

    function onItems(then) { if (!!coreBusFeedKeyedList) { var items = coreBusFeedKeyedList.GetKeyedItemList(); for (var i in items) { then(items[i]); } } };

    function createContentContainer() {
        var contentContainer = new tf.dom.Div(), contentContainerStyle = contentContainer.GetHTMLElement().style;
        //contentContainerStyle.height = "36px";
        contentContainerStyle.textAlign = 'left';
        contentContainerStyle.border = "2px solid navy";
        contentContainerStyle.borderRadius = "4px";
        contentContainerStyle.overflow = "hidden";
        return contentContainer;
    };

    function getVideoRowContent(notification) {
        var keyedItem = notification.keyedItem;
        var content = null;

        if (!!keyedItem) {
            var data = keyedItem.GetData();
            var props = data.properties;

            if ((content = keyedItem.listContent) == undefined) {
                content = createContentContainer();

                var titleDiv = new tf.dom.Div({ cssClass: "liveFeedTitle" });
                var titleDivE = titleDiv.GetHTMLElement();

                var videoDiv = new tf.dom.Div();
                var videoDivStyles = { textAlign: "center", padding: "1px", width: "calc(100% - 2px)", height: "208px", borderTop: "1px solid gray", display: "none" };

                styles.ApplyStyleProperties(videoDiv, videoDivStyles);

                content.AddContent(titleDiv, videoDiv);

                keyedItem.videoDiv = videoDiv;
                keyedItem.listContent = content;
                keyedItem.titleDivE = titleDivE;
            }

            keyedItem.titleDivE.innerHTML = props.name + '';
        }
        return { sender: theThis, content: content };
    }

    function getPlayerCallStr(item) {
        var itemData = item.GetData(), props = itemData.properties;
        return './playvideo.html?src=' + props.feedName;
    };

    function playOnNewTab(item) {
        if (item) {
            var itemData = item.GetData(), props = itemData.properties;
            var newW = window.open(getPlayerCallStr(item), "_blank");
            newW.addEventListener('load', function () {
                newW.document.title = "Live feed: " + item.GetData().properties.name;
            }, true);
            newW.focus();
        }
    };

    function getPlayVideoHTML(item) {
        return '<iframe style="width:100%;height:100%;border:0px;margin:0px;padding:0px;" allowfullscreen src="' + getPlayerCallStr(item) + '"></iframe>';
    };

    function unSelectSelectedFeed() {
        if (selectedFeed !== undefined) {
            selectedFeed.videoDiv.ClearContent();
            selectedFeed.videoDiv.GetHTMLElement().style.display = "none";
            playingHTML = undefined;
            selectedFeed = undefined;
        }
    };

    function onRowSelected(notification) {
        if (notification.isClick) {
            if (!!notification.selected) {
                var clickedFeed = notification.selected.GetKeyedItem();
                var clickedDifferentThanSelected = clickedFeed != selectedFeed;
                unSelectSelectedFeed();
                selectedFeed = clickedFeed;
                selectedFeed.videoDiv.GetHTMLElement().style.display = "block";
                selectedFeed.videoDiv.GetHTMLElement().innerHTML = playingHTML = getPlayVideoHTML(selectedFeed);
                checkButtonVisibility();
                if (clickedDifferentThanSelected) {
                    panToBus(selectedFeed);
                }
            }
        }
    };

    function createTable() {
        var tableSettings = { backgroundColor: "#000", selectOnHover: false, onSelect: onRowSelected };
        var tableRowStyle = {
            "tf-shadow": [0, 0, 3, "rgba(0,0,0,0.6)"],
            "textShadow": "1px 1px 1px #333",
            "border": "2px solid #fff",
            "backgroundColor": "rgba(255, 255, 255, 1)",
            "color": "#fff", "borderRadius": "4px",// "margin": "4px",
            "padding": "1px",
            paddingLeft: "6px",
            paddingRight: "6px",
            //width: "calc(100% - 20px)",
            overflow: "hidden"
        };
        var tableRowHoverStyle = {
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
        var settings = {
            keyedList: coreBusFeedKeyedList, optionalScope: theThis, tableSettings: tableSettings, rowSettings: rowSettings,
            properties: {},
            getRowContent: getVideoRowContent
        };

        topDiv = new tf.dom.Div({ cssClass: "tableScrollerDiv" });
        var topDivES = topDiv.GetHTMLElement().style;
        //topDivES.backgroundColor = "rgba(0, 51, 119, 0.1)";
        topDivES.display = 'block';
        topDivES.overflow = 'hidden';
        liveFeedsTable = new tf.ui.KeyedTable(settings)
        liveFeedsTable.SetSort(function (ra, rb) {
            var kia = ra.GetKeyedItem(), kib = rb.GetKeyedItem();
            var avid = kia.GetData().properties.name, bvid = kib.GetData().properties.name;
            return avid < bvid ? -1 : (avid > bvid ? 1 : 0);
        });

        createHeader(topDiv);

        var liveFeedsTableES = liveFeedsTable.GetHTMLElement().style;

        liveFeedsTableES.backgroundColor = "rgba(0, 51, 119, 0.1)";
        liveFeedsTableES.height = "calc(100% - " + (buttonsWrapperHeight + 10) + 'px)';
        liveFeedsTableES.overflowY = "auto";

        topDiv.AddContent(liveFeedsTable);
    }

    function createIcon(src, additionalStyles) {
        var icon = document.createElement('img'); icon.className = "svg-icon-button"; icon.src = src;
        if (additionalStyles) { styles.ApplyStyleProperties(icon, additionalStyles); }
        return icon;
    };

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

    function panToBus(feed) {
        if (feed) {
            if (settings.oc) {
                var adHocBuses = settings.oc.GetAdHocBuses();
                if (adHocBuses) {
                    var busId = feed.GetData().properties.feedData.busId;
                    adHocBuses.PanToBusById(busId);
                }
            }
        }
    }

    function onPanTo(notification) { panToBus(selectedFeed); };

    function onOpenVid(notification) { playOnNewTab(selectedFeed); };

    var buttons, buttonsWrappers;

    function createHeader(listLayoutToolbarTab) {
        var listLayoutToolbarTabE = listLayoutToolbarTab.GetHTMLElement();
        //var listLayoutToolbarTabES = listLayoutToolbarTabE.style;

        //listLayoutToolbarTabES.height = "initial";
        //listLayoutToolbarTabES.paddingBottom = "0px";

        var listButtonsWrapper = new tf.dom.Div({ cssClass: "listButtonsWrapper" });
        var listButtonsWrapperES = listButtonsWrapper.GetHTMLElement().style;

        listButtonsWrapperES.backgroundColor = "transparent";
        listButtonsWrapperES.height = buttonsWrapperHeight + 'px';

        var buttonsSpecs = [
            { key: "panTo", className: "track", tt: "Center map to bus position", onClick: onPanTo },
            { key: "openVid", className: "video", tt: "Open live feed on a separate tab", onClick: onOpenVid }
        ];

        buttonsWrappers = {};
        buttons = {};

        var lastButton;

        for (var i in buttonsSpecs) {
            var buttonSpec = buttonsSpecs[i];
            var className = buttonSpec.className;
            var key = buttonSpec.key;
            var tt = buttonSpec.tt;
            var button = createButton("list-button", buttonSpec.onClick, undefined, tt);
            var buttonWrapper = new tf.dom.Div({ cssClass: "listButtonWrapper listButtonWrapperWithHover" });
            button.appendChild(createIcon("./images/" + className + '.svg'));
            buttonWrapper.AddContent(button);
            listButtonsWrapper.AddContent(buttonWrapper);
            buttonsWrappers[key] = buttonWrapper;
            buttons[key] = button;
            lastButton = button;
        }

        lastButton.style.marginRight = "0px";
        lastButton = undefined;

        checkButtonVisibility();

        listLayoutToolbarTab.AddContent(listButtonsWrapper);
    }

    function onBusFeedsAdded(notification) {
        //var items = notification.items;
        checkButtonVisibility();
    };

    function onBusFeedsUpdated(notification) {
        //var items = notification.items;
    };

    function onBusFeedsDeleted(notification) {
        var items = notification.items;
        var needUnselect = false;
        for (var i in items) { if (needUnselect = (items[i] == selectedFeed)) { break; } }
        if (needUnselect) {
            unSelectSelectedFeed();
        }
        checkButtonVisibility();
    };

    function checkButtonVisibility() {
        var buttonsVisible = !!selectedFeed, displayVerb = buttonsVisible ? "inline-block" : "none";
        for (var i in buttonsWrappers) {
            buttonsWrappers[i].GetHTMLElement().style.display = displayVerb;
        }
    };

    function createcoreBusFeedKeyedList() {
        coreBusFeedList = core.GetBusFeedList();

        if (!!coreBusFeedList) {
            var listeners = {};
            listeners[tf.consts.keyedListAddedItemsEvent] = onBusFeedsAdded;
            listeners[tf.consts.keyedListUpdatedItemsEvent] = onBusFeedsUpdated;
            listeners[tf.consts.keyedListDeletedItemsEvent] = onBusFeedsDeleted;
            coreBusFeedKeyedList = coreBusFeedList.GetKeyedList();
            coreBusFeedService = coreBusFeedKeyedList.AddListeners(listeners);
            coreBusFeedKeyedList.NotifyItemsAdded(onBusFeedsAdded);
            liveFeedsTable.SetKeyedList(coreBusFeedKeyedList);
        }
    }

    function start() {
        createcoreBusFeedKeyedList();
    }

    function initialize() {
        styles = tf.GetStyles(tf.styles.GetGraphiteAPIStyleSpecifications());
        buttonsWrapperHeight = 32;
        canPlay = false;
        selectedFeed = undefined;
        createTable();
    }

    (function actualConstructor(theThisSet) { theThis = theThisSet; initialize(); })(this);
};


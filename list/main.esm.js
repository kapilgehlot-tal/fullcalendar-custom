/*!
FullCalendar List View Plugin v4.3.0
Docs & License: https://fullcalendar.io/
(c) 2019 Adam Shaw
*/

import { htmlEscape, FgEventRenderer, memoize, memoizeRendering, ScrollComponent, subtractInnerElHeight, sliceEventStore, intersectRanges, htmlToElement, createFormatter, createElement, buildGotoAnchorHtml, View, startOfDay, addDays, createPlugin } from 'fullcalendar-custom/core';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var ListEventRenderer = /** @class */ (function (_super) {
    __extends(ListEventRenderer, _super);
    function ListEventRenderer(listView) {
        var _this = _super.call(this) || this;
        _this.listView = listView;
        return _this;
    }
    ListEventRenderer.prototype.attachSegs = function (segs) {
        if (!segs.length) {
            this.listView.renderEmptyMessage();
        }
        else {
            this.listView.renderSegList(segs);
        }
    };
    ListEventRenderer.prototype.detachSegs = function () { };
    // generates the HTML for a single event row
    ListEventRenderer.prototype.renderSegHtml = function (seg) {
        var theme = this.context.theme;
        var eventRange = seg.eventRange;
        var eventDef = eventRange.def;
        //let eventInstance = eventRange.instance;
        var eventUi = eventRange.ui;
        var url = eventDef.url;
        var classes = ["fc-list-item"].concat(eventUi.classNames);
        //let bgColor = eventUi.backgroundColor;
        //let timeHtml;
        // if (eventDef.allDay) {
        //   timeHtml = getAllDayHtml(options);
        // } else if (isMultiDayRange(eventRange.range)) {
        //   if (seg.isStart) {
        //     timeHtml = htmlEscape(
        //       this._getTimeText(
        //         eventInstance.range.start,
        //         seg.end,
        //         false // allDay
        //       )
        //     );
        //   } else if (seg.isEnd) {
        //     timeHtml = htmlEscape(
        //       this._getTimeText(
        //         seg.start,
        //         eventInstance.range.end,
        //         false // allDay
        //       )
        //     );
        //   } else {
        //     // inner segment that lasts the whole day
        //     timeHtml = getAllDayHtml(options);
        //   }
        // } else {
        //   // Display the normal time text for the *event's* times
        //   timeHtml = htmlEscape(this.getTimeText(eventRange));
        // }
        if (url) {
            classes.push("fc-has-url");
        }
        return ('<tr class="' +
            classes.join(" ") +
            '">' +
            '<td colspan="3" class="fc-list-item-title ' +
            theme.getClass("widgetContent") +
            '">' +
            "<a" +
            (url ? ' href="' + htmlEscape(url) + '"' : "") +
            ">" +
            (eventDef.title || "") +
            "</a>" +
            "</td>" +
            "</tr>");
    };
    // like "4:00am"
    ListEventRenderer.prototype.computeEventTimeFormat = function () {
        return {
            hour: "numeric",
            minute: "2-digit",
            meridiem: "short"
        };
    };
    return ListEventRenderer;
}(FgEventRenderer));

/*
Responsible for the scroller, and forwarding event-related actions into the "grid".
*/
var ListView = /** @class */ (function (_super) {
    __extends(ListView, _super);
    function ListView(viewSpec, parentEl) {
        var _this = _super.call(this, viewSpec, parentEl) || this;
        _this.computeDateVars = memoize(computeDateVars);
        _this.eventStoreToSegs = memoize(_this._eventStoreToSegs);
        _this.renderSkeleton = memoizeRendering(_this._renderSkeleton, _this._unrenderSkeleton);
        var eventRenderer = _this.eventRenderer = new ListEventRenderer(_this);
        _this.renderContent = memoizeRendering(eventRenderer.renderSegs.bind(eventRenderer), eventRenderer.unrender.bind(eventRenderer), [_this.renderSkeleton]);
        return _this;
    }
    ListView.prototype.firstContext = function (context) {
        context.calendar.registerInteractiveComponent(this, {
            el: this.el
            // TODO: make aware that it doesn't do Hits
        });
    };
    ListView.prototype.render = function (props, context) {
        _super.prototype.render.call(this, props, context);
        var _a = this.computeDateVars(props.dateProfile), dayDates = _a.dayDates, dayRanges = _a.dayRanges;
        this.dayDates = dayDates;
        this.renderSkeleton(context);
        this.renderContent(context, this.eventStoreToSegs(props.eventStore, props.eventUiBases, dayRanges));
    };
    ListView.prototype.destroy = function () {
        _super.prototype.destroy.call(this);
        this.renderSkeleton.unrender();
        this.renderContent.unrender();
        this.context.calendar.unregisterInteractiveComponent(this);
    };
    ListView.prototype._renderSkeleton = function (context) {
        var theme = context.theme;
        this.el.classList.add('fc-list-view');
        var listViewClassNames = (theme.getClass('listView') || '').split(' '); // wish we didn't have to do this
        for (var _i = 0, listViewClassNames_1 = listViewClassNames; _i < listViewClassNames_1.length; _i++) {
            var listViewClassName = listViewClassNames_1[_i];
            if (listViewClassName) { // in case input was empty string
                this.el.classList.add(listViewClassName);
            }
        }
        this.scroller = new ScrollComponent('hidden', // overflow x
        'auto' // overflow y
        );
        this.el.appendChild(this.scroller.el);
        this.contentEl = this.scroller.el; // shortcut
    };
    ListView.prototype._unrenderSkeleton = function () {
        // TODO: remove classNames
        this.scroller.destroy(); // will remove the Grid too
    };
    ListView.prototype.updateSize = function (isResize, viewHeight, isAuto) {
        _super.prototype.updateSize.call(this, isResize, viewHeight, isAuto);
        this.eventRenderer.computeSizes(isResize);
        this.eventRenderer.assignSizes(isResize);
        this.scroller.clear(); // sets height to 'auto' and clears overflow
        if (!isAuto) {
            this.scroller.setHeight(this.computeScrollerHeight(viewHeight));
        }
    };
    ListView.prototype.computeScrollerHeight = function (viewHeight) {
        return viewHeight -
            subtractInnerElHeight(this.el, this.scroller.el); // everything that's NOT the scroller
    };
    ListView.prototype._eventStoreToSegs = function (eventStore, eventUiBases, dayRanges) {
        return this.eventRangesToSegs(sliceEventStore(eventStore, eventUiBases, this.props.dateProfile.activeRange, this.context.nextDayThreshold).fg, dayRanges);
    };
    ListView.prototype.eventRangesToSegs = function (eventRanges, dayRanges) {
        var segs = [];
        for (var _i = 0, eventRanges_1 = eventRanges; _i < eventRanges_1.length; _i++) {
            var eventRange = eventRanges_1[_i];
            segs.push.apply(segs, this.eventRangeToSegs(eventRange, dayRanges));
        }
        return segs;
    };
    ListView.prototype.eventRangeToSegs = function (eventRange, dayRanges) {
        var _a = this.context, dateEnv = _a.dateEnv, nextDayThreshold = _a.nextDayThreshold;
        var range = eventRange.range;
        var allDay = eventRange.def.allDay;
        var dayIndex;
        var segRange;
        var seg;
        var segs = [];
        for (dayIndex = 0; dayIndex < dayRanges.length; dayIndex++) {
            segRange = intersectRanges(range, dayRanges[dayIndex]);
            if (segRange) {
                seg = {
                    component: this,
                    eventRange: eventRange,
                    start: segRange.start,
                    end: segRange.end,
                    isStart: eventRange.isStart && segRange.start.valueOf() === range.start.valueOf(),
                    isEnd: eventRange.isEnd && segRange.end.valueOf() === range.end.valueOf(),
                    dayIndex: dayIndex
                };
                segs.push(seg);
                // detect when range won't go fully into the next day,
                // and mutate the latest seg to the be the end.
                if (!seg.isEnd && !allDay &&
                    dayIndex + 1 < dayRanges.length &&
                    range.end <
                        dateEnv.add(dayRanges[dayIndex + 1].start, nextDayThreshold)) {
                    seg.end = range.end;
                    seg.isEnd = true;
                    break;
                }
            }
        }
        return segs;
    };
    ListView.prototype.renderEmptyMessage = function () {
        this.contentEl.innerHTML =
            '<div class="fc-list-empty-wrap2">' + // TODO: try less wraps
                '<div class="fc-list-empty-wrap1">' +
                '<div class="fc-list-empty">' +
                htmlEscape(this.context.options.noEventsMessage) +
                '</div>' +
                '</div>' +
                '</div>';
    };
    // called by ListEventRenderer
    ListView.prototype.renderSegList = function (allSegs) {
        var theme = this.context.theme;
        var segsByDay = this.groupSegsByDay(allSegs); // sparse array
        var dayIndex;
        var daySegs;
        var i;
        var tableEl = htmlToElement('<table class="fc-list-table ' + theme.getClass('tableList') + '"><tbody></tbody></table>');
        var tbodyEl = tableEl.querySelector('tbody');
        for (dayIndex = 0; dayIndex < segsByDay.length; dayIndex++) {
            daySegs = segsByDay[dayIndex];
            if (daySegs) { // sparse array, so might be undefined
                // append a day header
                tbodyEl.appendChild(this.buildDayHeaderRow(this.dayDates[dayIndex]));
                daySegs = this.eventRenderer.sortEventSegs(daySegs);
                for (i = 0; i < daySegs.length; i++) {
                    tbodyEl.appendChild(daySegs[i].el); // append event row
                }
            }
        }
        this.contentEl.innerHTML = '';
        this.contentEl.appendChild(tableEl);
    };
    // Returns a sparse array of arrays, segs grouped by their dayIndex
    ListView.prototype.groupSegsByDay = function (segs) {
        var segsByDay = []; // sparse array
        var i;
        var seg;
        for (i = 0; i < segs.length; i++) {
            seg = segs[i];
            (segsByDay[seg.dayIndex] || (segsByDay[seg.dayIndex] = []))
                .push(seg);
        }
        return segsByDay;
    };
    // generates the HTML for the day headers that live amongst the event rows
    ListView.prototype.buildDayHeaderRow = function (dayDate) {
        var _a = this.context, theme = _a.theme, dateEnv = _a.dateEnv, options = _a.options;
        var mainFormat = createFormatter(options.listDayFormat); // TODO: cache
        var altFormat = createFormatter(options.listDayAltFormat); // TODO: cache
        return createElement('tr', {
            className: 'fc-list-heading',
            'data-date': dateEnv.formatIso(dayDate, { omitTime: true })
        }, '<td class="' + (theme.getClass('tableListHeading') ||
            theme.getClass('widgetHeader')) + '" colspan="3">' +
            (mainFormat ?
                buildGotoAnchorHtml(options, dateEnv, dayDate, { 'class': 'fc-list-heading-main' }, htmlEscape(dateEnv.format(dayDate, mainFormat)) // inner HTML
                ) :
                '') +
            (altFormat ?
                buildGotoAnchorHtml(options, dateEnv, dayDate, { 'class': 'fc-list-heading-alt' }, htmlEscape(dateEnv.format(dayDate, altFormat)) // inner HTML
                ) :
                '') +
            '</td>');
    };
    return ListView;
}(View));
ListView.prototype.fgSegSelector = '.fc-list-item'; // which elements accept event actions
function computeDateVars(dateProfile) {
    var dayStart = startOfDay(dateProfile.renderRange.start);
    var viewEnd = dateProfile.renderRange.end;
    var dayDates = [];
    var dayRanges = [];
    while (dayStart < viewEnd) {
        dayDates.push(dayStart);
        dayRanges.push({
            start: dayStart,
            end: addDays(dayStart, 1)
        });
        dayStart = addDays(dayStart, 1);
    }
    return { dayDates: dayDates, dayRanges: dayRanges };
}

var main = createPlugin({
    views: {
        list: {
            class: ListView,
            buttonTextKey: 'list',
            listDayFormat: { month: 'long', day: 'numeric', year: 'numeric' } // like "January 1, 2016"
        },
        listDay: {
            type: 'list',
            duration: { days: 1 },
            listDayFormat: { weekday: 'long' } // day-of-week is all we need. full date is probably in header
        },
        listWeek: {
            type: 'list',
            duration: { weeks: 1 },
            listDayFormat: { weekday: 'long' },
            listDayAltFormat: { month: 'long', day: 'numeric', year: 'numeric' }
        },
        listMonth: {
            type: 'list',
            duration: { month: 1 },
            listDayAltFormat: { weekday: 'long' } // day-of-week is nice-to-have
        },
        listYear: {
            type: 'list',
            duration: { year: 1 },
            listDayAltFormat: { weekday: 'long' } // day-of-week is nice-to-have
        }
    }
});

export default main;
export { ListView };

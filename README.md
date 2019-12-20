# Full calendar custom

Full calendar custom javascript library for dealing calendar.

## Installation

Use the package manager npm to install Full calendar.

```bash
npm install fullcalendar-custom
```

## Usage

```javascript

import dayGridPlugin from 'fullcalendar-custom/daygrid';
import timeGridPlugin from 'fullcalendar-custom/timegrid';

let eventDataInCaseOfSimpleHTML = [{
 {
        title: "<h2>New Event</h2>",
        start: new Date()
 },
 {
        title: "<h2>New Event</h2>",
        start: new Date()
 },
}]

let eventDataInCaseOfReactComponent = [{
 {
        title: renderToString( <ListItem/>),
        start: new Date()
 },
 {
        title: renderToString( <ListItem/>),
        start: new Date()
 },
}]




```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

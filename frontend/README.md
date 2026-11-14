# Frontend (Pole 3)

The web application is not created yet. The stack is to be confirmed by the team
(see [`../docs/project/decisions_log.md`](../docs/project/decisions_log.md)).

## Start now, without the API

Build the screens from the real engine outputs in
[`../contract/examples/`](../contract/examples/) — format described in
[`../contract/README.md`](../contract/README.md).

Main journey (P0):

1. choose a site (catalogue) and a start date / duration;
2. verdict + 3 key numbers (time before sunset, time before Earthset, hours with both);
3. sky view: skyline (`horizon_*.json`), Sun and Earth positions over time;
4. 30-day timeline of `windows.sun`, `windows.earth`, `windows.both`;
5. compare 2–3 sites (same date) or 2 dates (same site).

Show units, distinguish *visible / partial / hidden*, and never present Sun visibility as
power or Earth visibility as a radio link.

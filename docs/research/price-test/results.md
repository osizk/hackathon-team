# Price test: results

The 50 items are in [items.md](items.md). The summary is in
[summary.md](summary.md).

## How to read this file

- **Thai price**: the cheapest total delivered to a Bangkok address from a
  shop that ships from inside Thailand. Price plus domestic shipping, in THB.
  Shopee or Lazada listings that ship from abroad count as world, not Thai.
- **World price**: the cheapest total delivered to Thailand from a shop
  abroad. Item price plus international shipping, then Thai import duty, then
  7% VAT. In THB.
- **Difference**: world total minus Thai total. A plus sign means the world
  price is higher, so Thailand wins. A minus sign means the world wins.
- **Tags**: [seen] means the page was opened and the price read. [search]
  means the price came only from a search result.
- **Date read**: 2026-10-15 for every price.
- "not found" means no price was found. We did not guess.

## Important limit of this test

This session could not open any shop page. Page fetches failed for every shop
host (DNS failure and proxy 403). Only web search worked. So every price here
is tagged [search]. Search results can be old, can show a seller's lowest
variant, and can miss shipping. Treat every number as a lead, not a checked
price. The agent in the real app opens the page, so it can do better.

## Money rules used

- **FX rate**: 1 USD = 33.62 THB. Source: Trading Economics, USD/THB on
  14 October 2026 (<https://tradingeconomics.com/thailand/currency>), found by
  web search on 2026-10-15. Other currencies are converted through USD with
  the ECB euro reference rates of 13 October 2026
  (<https://www.ecb.europa.eu/stats/shared/pdf/eurofxref.pdf>): per 1 EUR,
  USD 1.1188, JPY 176.91, GBP 0.8446, CNY 7.4890, KRW 1500.81, SGD 1.4319,
  AUD 1.6033.
- **Import tax**: since 1 January 2026, Thai Customs Notification 219/2568
  ended the 1,500 THB duty exemption for small parcels. Duty and 7% VAT apply
  to every parcel. Sources:
  <https://www.vatupdate.com/2026/01/03/thailand-to-end-customs-duty-relief-for-low-value-imports-from-january-2026/>,
  <https://thainexus.co.th/en/thailand-ends-free-duties-on-cheap-online-imports/>.
- **Formula**: world total = (item + shipping) x (1 + duty rate) x 1.07.
  Duty is on the CIF value (item plus shipping). VAT is on CIF plus duty.
  Insurance is left out.
- **Duty rate**: the rate for each item is in its notes, with its source. We
  used the normal (MFN) rate, not a free trade agreement rate: a personal
  parcel rarely has a certificate of origin. Where no source was found, we
  used 10% and the note says "assumed".
- **Not included**: courier clearance or handling fees, card FX fees, and
  any shop coupon that needs an account. These would make the world price
  higher, not lower.

## Results

Prices are in THB. "ship" is shipping. In the world column, the item and
shipping are first shown in the shop's currency.

| # | Item | Thai total (THB) | Thai source | World total (THB) | World source | Difference THB (%) | Winner | Delivery | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

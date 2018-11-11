<link href="https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-MCw98/SFnGE8fJT3GXwEOngsV7Zt27NXFoaoApmYm81iuXoPkFOJwJ8ERdknLPMO" crossorigin="anonymous">

# CurrencyInfo

Information about the world's currencies. Fetched from Wikipedia pages.

**Contents of this dataset**
> For the purposes of this list, only currencies that are legal tender, including those used in actual commerce or issued for commemorative purposes, are considered "circulating currencies". This includes fractional units that have no physical form but are recognized by the issuing state, such as the United States mill, the Egyptian millime, and the Japanese rin. Currencies used by non-state entities, like the Sovereign Military Order of Malta, scrips used by private entities, and other private, virtual, and alternative currencies are not under the purview of this list.

_Exerpt from Wikipedia._

## Downloads

Check [the Gitlab Pages](https://wesleye.gitlab.io/currencyinfo/) for the downloadable files.

- [Minified Data](./public/currencies.min.json)
- [Pretty Data](./public/currencies.json)
- [Crawled URLS](./public/urls.json)

## Data

### Peculiarities in the data

- Some currencies do not make a distinction in the frequently / infrequently designation. Those denominations are listed in this dataset as frequently
- Zimbabwe has bond coins without a 'real' name, resulting in the row with all (none)'s

### Example Data
```
  "RUB": {
    "name": "Russian ruble",
    "symbols": [
      "₽"
    ],
    "iso": "RUB",
    "countries": [
      "Ukraine"
    ],
    "fractionalUnit": "Kopek",
    "numberToBasic": "100",
    "banknotes": {
      "rarely": [
        "5",
        "10"
      ],
      "frequently": [
        "50",
        "100",
        "200",
        "500",
        "1,000",
        "2,000",
        "5,000"
      ]
    },
    "coins": {
      "rarely": [
        "1",
        "5",
        "10",
        "50"
      ],
      "frequently": [
        "1",
        "2",
        "5",
        "10"
      ]
    }
  },
```

## Wikipedia & License

### Changes to data
The text has been changed to fit a JSON machine-readable format. Currency denominations have been altered and stripped of their symbols.

### License
The Creative Commons Attribution-Share-Alike License 3.0 is used.
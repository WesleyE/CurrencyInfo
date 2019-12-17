/**
 * This crawler crawls Wikipedia to rip the currency
 * denominations from the pages.
 * 
 * Based on
 * @see https://github.com/bda-research/node-crawler
 * 
 * 
 * Strange things:
 * 
 *  Currency pages
 *  - Sometimes, Banknotes and Coins are without freq. used and rarely used. In this case, it is on the same line.
 * 
 * Main page
 *  - Countries with multiple pages, first currency is 6 cells wide, all the others are 5.
 *  - Zimbabwe has bond coins without a 'real' name, resulting in the row with all (none)'s
 * 
 * Todo:
 * - Tidy up
 * - Better error handling
 */

var showdown = require('showdown');
var Crawler = require("crawler");
var fs = require('fs');

var foundCurrencies = {};
var drainEventActive = false;
var debugMaxCurrencies = 0;
var urlsCrawled = [];
var debug = false;

// Create the Crawler
var c = new Crawler({
    maxConnections : 1,
    rateLimit: 1000, // 1 every second
    callback : function (error, res, done) {
        handleError(error);

        if(res.options.type === 'base') {
            parseBasePage(error, res, done)
        } else if(res.options.type === 'currency') {
            parseCurrencyPage(error, res, done)
        }
    }
});

/**
 * Parse Wikipedia's detail page on the currency.
 *
 * @param {*} error
 * @param {*} res
 * @param {*} done
 */
function parseCurrencyPage(error, res, done) {
    drainEventActive = true;
    var $ = res.$;

    var rows = $('.infobox').find('tbody').find('tr');

    console.log(`Parsing ${res.options.iso}`);

    var isInBankNotes = false;
    var isInCoins = false;
    rows.each((i, element) => {
        var e = $(element);
        const tdText = parseDenominations(trimText(e.find('td').text()));

        var tableHeader = e.find('th');
        var t = $(tableHeader).text();
        if($(tableHeader).text() === 'Banknotes') {
            // If there also is a td in the row, it is directly used
            if(tdText != null && tdText != '') {
                foundCurrencies[res.options.iso]['banknotes']['frequently'] = tdText;
                if(debug) { console.log(`Found Single Banknotes ${tdText}`); }
                return;
            }

            if(debug) { console.log('Found Banknotes'); }

            isInBankNotes = true;
            isInCoins = false;
        }
        else if($(tableHeader).text() === 'Coins') {
            // If there also is a td in the row, it is directly used
            if(tdText != null && tdText != '') {
                foundCurrencies[res.options.iso]['coins']['frequently'] = tdText;
                if(debug) { 
                    console.log(`Found single Coins ${tdText}`); 
                }
                return;
            }

            if(debug) { console.log('Found Coins'); }

            isInBankNotes = false;
            isInCoins = true;
        } else if($(tableHeader).text() === ' Freq. used' && isInBankNotes) {
            // Freq. used for Banknotes
            if(debug) { console.log('Found Freq. used'); }
            foundCurrencies[res.options.iso]['banknotes']['frequently'] = tdText;
        } else if($(tableHeader).text() === ' Freq. used' && isInCoins) {
            // Freq. used for Coins
            if(debug) { console.log('Found Freq. used'); }
            foundCurrencies[res.options.iso]['coins']['frequently'] = tdText;
        } else if($(tableHeader).text() === ' Rarely used' && isInBankNotes) {
            // Rarely used for Banknotes
            if(debug) { console.log('Found Rarely used'); }
            foundCurrencies[res.options.iso]['banknotes']['rarely'] = tdText;
        } else if($(tableHeader).text() === ' Rarely used' && isInCoins) {
            // Rarely used for Coins
            if(debug) { console.log('Found Rarely used'); }
            foundCurrencies[res.options.iso]['coins']['rarely'] = tdText;
        }
    });

    // Check for empty data
    var currencySum = foundCurrencies[res.options.iso]['banknotes']['frequently'].length +
    foundCurrencies[res.options.iso]['banknotes']['rarely'].length +
    foundCurrencies[res.options.iso]['coins']['frequently'].length +
    foundCurrencies[res.options.iso]['coins']['rarely'].length;

    if(currencySum === 0) {
        console.error(`No denominations found for ${res.options.country} ${res.options.iso}!`);
    }

    if(debug) { console.log('\n'); }

    done();
}

/**
 * Parse the currencies base listing from Wikipedia
 *
 * @param {*} error
 * @param {*} res
 * @param {*} done
 */
function parseBasePage(error, res, done) {
    var $ = res.$;

    // Find all rows
    var rows = $('.wikitable').find('tbody').find('tr');

    // Foreach Rows
    var previousCountry = null;
    rows.each((i, element) => {
        var e = $(element);

        // Check if it has a first td with a rowspan=2
        var cells = e.find('td');
        if(cells.length == 0) {
            return;
        }


        var url = false;
        var iso = null;
        // See note [1]
        if(cells.length == 5) {
            iso = trimText(cells.eq(2).text());
        } else {
            iso = trimText(cells.eq(3).text());
        }

        if(typeof foundCurrencies.iso === "undefined") {
            foundCurrencies[iso] = createBaseCurrencyObject();
        }

        // If there are only 5 cells, this currency belongs to the previous country
        // See note [1]
        if(cells.length == 5) {
            if(foundCurrencies[iso].countries.indexOf(previousCountry) === -1) {
                foundCurrencies[iso].countries.push(previousCountry);
            }
            
            foundCurrencies[iso].name = trimText(cells.first().text());
            foundCurrencies[iso].symbols = trimText(cells.eq(1).text()).split(' or ');
            foundCurrencies[iso].iso = iso;
            foundCurrencies[iso].fractionalUnit = trimText(cells.eq(3).text());
            foundCurrencies[iso].numberToBasic = trimText(cells.eq(4).text());
            url = parseUrl(cells.first().find('a').attr('href'));
        } else {
            previousCountry = trimText(cells.first().text());
            if(foundCurrencies[iso].countries.indexOf(previousCountry) === -1) {
                foundCurrencies[iso].countries.push(previousCountry);
            }

            foundCurrencies[iso].name = trimText(cells.eq(1).text());
            foundCurrencies[iso].symbols = trimText(cells.eq(2).text()).split(' or ');
            foundCurrencies[iso].iso = iso;
            foundCurrencies[iso].fractionalUnit = trimText(cells.eq(4).text());
            foundCurrencies[iso].numberToBasic = trimText(cells.eq(5).text());
            url = parseUrl(cells.eq(1).find('a').attr('href'));
        }

        // Queue the url, but don't parse twice
        if(url !== false && ~urlsCrawled.indexOf(url) == false && debugMaxCurrencies < 5) {
            urlsCrawled.push(url);

            // Dont parse twice
            c.queue({
                uri: url,
                iso: iso,
                type: 'currency',
            });
            if(debug) {
                debugMaxCurrencies = debugMaxCurrencies + 1;
            }
        }
    });
    done();
}

function createBaseCurrencyObject() {
    return {
        'name': null,
        'symbols': [],
        'iso': null,
        'countries': [],
        'fractionalUnit': null,
        'numberToBasic': null,
        'banknotes': {
            'rarely': [],
            'frequently': []
        },
        'coins': {
            'rarely': [],
            'frequently': []
        }
    };
}


/**
 * Separate demonimations into an array of numbers
 * 
 * Example string:
 * 50₽, 100₽, 200₽, 500₽, 1,000₽, 2,000₽, 5,000₽, 1.00e
 *
 * @param {*} str
 * @returns
 */
function parseDenominations(str) {
    return str.match(/([0-9]((,|\.)[0-9]+)*)+/g, '');
}

/**
 * Parse and validate the url
 *
 * @param {*} url
 * @returns
 */
function parseUrl(url) {
    var base = 'https://en.wikipedia.org';
    if(url === undefined) {
        return false;
    }

    if(url.charAt(0) === '#') {
        return false;
    }

    return `${base}/${url}`;
}

/**
 * Handle errors during crawling
 *
 * @param {*} error
 */
function handleError(error) {
    if(error) {
        console.log(error);
        throw "Error during crawling";   
    }
}

/**
 * Trim a label from newlines and [] annotations
 *
 * @param {*} text
 */
function trimText(text) {
    return text.replace(/[\n\t\r]/g,"").trim().replace(/(\[.*\])/g,"");
}

// Start at the "Circulating Currencies" page
urlsCrawled.push('https://en.wikipedia.org/wiki/List_of_circulating_currencies');
c.queue({
    uri: 'https://en.wikipedia.org/wiki/List_of_circulating_currencies',
    type: 'base',
});


/**
 * Whenever the queue is empty, drain the thing.
 */
c.on('drain',function() {
    if(!drainEventActive) {
        return;
    }

    // Write json files
    const prettyCurrencyJson = JSON.stringify(foundCurrencies, null, 2);
    fs.writeFile('./public/currencies.json', prettyCurrencyJson, 'utf8', () => { return; });

    const currencyJson = JSON.stringify(foundCurrencies);
    fs.writeFile('./public/currencies.min.json', currencyJson, 'utf8', () => { return; });    

    var urlsJson = JSON.stringify(urlsCrawled, null, 2);
    fs.writeFile('./public/urls.json', urlsJson, 'utf8', () => { return; });

    // Write the readme
    var readme = fs.readFileSync('README.md', 'utf8');

    let date = new Date();  
    let options = {  
        weekday: "long", year: "numeric", month: "short",  
        day: "numeric", hour: "2-digit", minute: "2-digit"  
    };

    readme = readme + `\n### Crawled URLS\n\nLast crawl date: _${date.toLocaleTimeString('en-us', options)}_`;

    readme = readme + '\n```\n';
    urlsCrawled.forEach(url => {
        readme = readme + `\n- ${url}`;
    });
    readme = readme + '\n```\n';

    var converter = new showdown.Converter({completeHTMLDocument: true});
    var html = converter.makeHtml(readme);
    fs.writeFile('./public/index.html', html, 'utf8', () => { return; });
});
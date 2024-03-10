/**
 * @file common_utils.js
 * @brief Collection of utility functions to abstract scraper.js
 * @author luethan2025
 * @release 2024
 */
const { existsSync, mkdirSync, createWriteStream } = require('fs');
const { join } = require('path');
const { BadConnectionError } = require('./lib/error');

/**
 * Returns the hyperlinks to artist's illustrations (based on the current
 * webpage)
 * @param {Object} page Puppeteer page instance
 * @return {Array} Hyperlinks to artist's illustrations
 */
async function collectLinks(page) {
  const tags = await page.$x('//a');
  const hrefs = await Promise.all(
    tags.map(async (item) => await (await item.getProperty('href')).jsonValue())
  );

  // decode hyperlinks
  const hyperlinks = hrefs.filter((src) => src.includes('en/artworks'));
  return hyperlinks;
}

/**
 * Adds onto an artist's list of illustrations
 * @param {Object} page Puppeteer page instance
 * @param {Object} illustrations Dictionary containing artist-illustrations
 *                 key-value pairs
 */
async function addToIllustrations(page, illustrations) {
  const hyperlinks = await collectLinks(page);
  hyperlinks.forEach((item) => illustrations[artistName].add(item));
}

/**
 * Returns hyperlinks to all of an artist's illustrations
 * @param {Object} page Puppeteer page instance
 * @param {String} url Artist base URL
 * @return {Object} Dictionary containing artist-illustrations key-value pairs
 */
async function collectIllustrations(page, url) {
  const illustrations = new Object();
  const [user] = await page.$x(
    '//span[text()="Following"]/../../../../div/div/h1'
  );

  artistName = await page.evaluate((text) => text.innerText, user);
  artistName = artistName.trim();
  console.log(`Found artist name: ${artistName}\n`);

  illustrations[artistName] = new Set();
  await addToIllustrations(page, illustrations);

  // check if there are more than one page of illustrations
  const [works] = await page.$x(
    '//h2["Illustrations and Manga"]/../div/div/span'
  );
  const numberOfWorks = await page.evaluate((text) => text.innerText, works);

  // navigate to other pages (if necessary)
  const maxPageNumber = Math.ceil(Number(numberOfWorks) / (8 * 6));
  console.log(`Found ${numberOfWorks} total illustrations`);
  console.log(`Found ${maxPageNumber} total pages\n`);
  for (let p = 2; p <= maxPageNumber; p++) {
    console.log(`Navigating to ${url}/illustrations?p=${p}`);
    try {
      const response = await page.goto(`${url}/illustrations?p=${p}`, {
        waitUntil: 'networkidle2'
      });

      const status = response.status();
      if (status !== 200) {
        console.log('Connection was unsucessful');
        throw new BadConnectionError(
          `Status expected HTTP ${200} ${getReasonPhrase(200)}, ` +
            `but was HTTP ${status} ${getReasonPhrase(status)}`
        );
      } else {
        await addToIllustrations(page, illustrations);
      }
    } catch {
      console.log('Something went wrong. Skipping\n');
    }
  }
  return illustrations;
}

/**
 * Downloads all the illustrations from a pixiv artist
 * @param {Object} page Puppeteer page instance
 * @param {String} directory Destination directory
 * @param {Object} illustrations Dictionary containing artist-illustrations
 *                 key-value pairs
 */
async function downloadIllustrations(page, directory, illustrations) {
  // intercept any potential images
  page.on('response', async (response) => {
    const interceptedURL = response.url();
    if (
      response.request().method().toUpperCase() !== 'OPTION' &&
      interceptedURL.includes('https://i.pximg.net/img-master') === true
    ) {
      response.buffer().then((file) => {
        const fileName = `${artistName}_${illustrationCounter}.jpg`;
        const filePath = join(directory, fileName);
        try {
          console.log(`Intercepted ${interceptedURL}`);
          const stream = createWriteStream(filePath);
          stream.write(file);
          console.log(`Successfully wrote ${fileName} to local disk\n`);
        } catch (err) {
          console.log(err);
          console.log(`Failed to write ${fileName} to local disk\n`);
        }
      });
    }
  });

  // creates the destination directory (if necessary)
  if (existsSync(directory) === false) {
    mkdirSync(directory, { recursive: true });
    console.log(`${directory} was created successfully\n`);
  } else {
    console.log(`${directory} was found\n`);
  }

  const hyperlinks = illustrations[artistName];
  let illustrationCounter = 0;
  for (const url of hyperlinks) {
    try {
      console.log(`Navigating to ${url}`);
      const response = await page.goto(url, {
        waitUntil: 'networkidle2'
      });

      const status = response.status();
      if (status !== 200) {
        console.log('Connection was unsucessful');
        throw new BadConnectionError(
          `Status expected HTTP ${200} ${getReasonPhrase(200)}, ` +
            `but was HTTP ${status} ${getReasonPhrase(status)}`
        );
      }
    } catch {
      console.log('Something went wrong. Skipping\n');
    }
    illustrationCounter++;
  }
}

/**
 * Curator main routine
 * @param {Object} page Puppeteer page instance
 * @param {String} url Artist base URL
 * @param {String} directory Destination directory
 */
async function download(page, url, directory) {
  const illustrations = await collectIllustrations(page, url);
  await downloadIllustrations(page, directory, illustrations);
}

module.exports = { download };
